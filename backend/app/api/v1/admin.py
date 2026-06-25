"""Admin endpoints (catalog mgmt, worker approval, ledger, dashboards)."""
from typing import List, Optional
from uuid import UUID

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser, get_current_user, is_admin, require_roles
from app.models.enums import (
    BookingStatus,
    EscalationStatus,
    UserRole,
    UserStatus,
    WorkerOnboardingStatus,
)
from app.models.models import (
    Booking,
    ConsumerProfile,
    Escalation,
    FinancialLedger,
    Patient,
    User,
    WorkerDocument,
    WorkerProfile,
)

router = APIRouter(prefix="/admin", tags=["admin"])


class DocumentReviewRequest(BaseModel):
    status: str
    reason: Optional[str] = None


class BackgroundCheckRequest(BaseModel):
    status: str
    reason: Optional[str] = None


class WorkerRejectionRequest(BaseModel):
    reason: str


@router.get("/dashboard")
async def admin_dashboard(
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not is_admin(current.role):
        raise HTTPException(status_code=403, detail="Admin only")
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_consumers = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.consumer))).scalar() or 0
    total_workers = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.worker))).scalar() or 0
    pending_workers = (await db.execute(select(func.count(WorkerProfile.id)).where(WorkerProfile.onboarding_status == WorkerOnboardingStatus.pending_review))).scalar() or 0
    bookings_today = (await db.execute(select(func.count(Booking.id)).where(Booking.scheduled_date == func.current_date()))).scalar() or 0
    open_escalations = (await db.execute(select(func.count(Escalation.id)).where(Escalation.status != EscalationStatus.resolved))).scalar() or 0
    return {
        "total_users": total_users,
        "total_consumers": total_consumers,
        "total_workers": total_workers,
        "pending_worker_approvals": pending_workers,
        "bookings_today": bookings_today,
        "open_escalations": open_escalations,
    }


@router.get("/workers/pending")
async def pending_workers(
    current: CurrentUser = Depends(require_roles(UserRole.admin_ops, UserRole.admin_super)),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(WorkerProfile, User).join(User, User.id == WorkerProfile.user_id).where(WorkerProfile.onboarding_status == WorkerOnboardingStatus.pending_review)
    )
    items = []
    for wp, u in res.all():
        docs_res = await db.execute(
            select(WorkerDocument).where(WorkerDocument.worker_id == wp.id)
        )
        documents = [
            {
                "id": str(doc.id),
                "document_type": doc.document_type,
                "verification_status": doc.verification_status,
                "document_url": doc.cloudinary_url,
                "rejection_reason": doc.rejection_reason,
            }
            for doc in docs_res.scalars().all()
        ]
        items.append({
            "worker_id": str(wp.id),
            "user_id": str(u.id),
            "full_name": u.full_name,
            "phone": u.phone_e164,
            "email": u.email,
            "tier": wp.tier.value,
            "background_check_status": wp.background_check_status,
            "documents": documents,
            "created_at": wp.created_at.isoformat(),
        })
    return items


@router.post("/workers/{worker_id}/approve")
async def approve_worker(
    worker_id: UUID,
    current: CurrentUser = Depends(require_roles(UserRole.admin_ops, UserRole.admin_super)),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(WorkerProfile).where(WorkerProfile.id == worker_id))
    wp = res.scalar_one_or_none()
    if not wp:
        raise HTTPException(status_code=404, detail="Worker not found")
    if wp.onboarding_status != WorkerOnboardingStatus.pending_review:
        raise HTTPException(status_code=409, detail="Worker has not submitted onboarding for review")
    docs_res = await db.execute(select(WorkerDocument).where(WorkerDocument.worker_id == wp.id))
    docs = list(docs_res.scalars().all())
    required = {"aadhaar", "nursing_license", "education_certificate", "police_verification"}
    verified_types = {
        d.document_type
        for d in docs
        if d.verification_status == "verified"
        and (d.valid_until is None or d.valid_until >= date.today())
    }
    missing_verified = sorted(required - verified_types)
    if missing_verified:
        raise HTTPException(
            status_code=409,
            detail={"message": "Required documents are not verified", "documents": missing_verified},
        )
    if wp.background_check_status != "passed":
        raise HTTPException(status_code=409, detail="Background check has not passed")
    wp.onboarding_status = WorkerOnboardingStatus.approved
    wp.onboarding_reviewed_at = datetime.now(timezone.utc)
    wp.onboarding_rejection_reason = None
    await db.commit()
    return {"approved": True}


@router.patch("/workers/{worker_id}/documents/{document_id}")
async def review_worker_document(
    worker_id: UUID,
    document_id: UUID,
    payload: DocumentReviewRequest,
    current: CurrentUser = Depends(require_roles(UserRole.admin_ops, UserRole.admin_super)),
    db: AsyncSession = Depends(get_db),
):
    if payload.status not in ("verified", "rejected"):
        raise HTTPException(status_code=400, detail="Document status must be verified or rejected")
    res = await db.execute(
        select(WorkerDocument).where(
            WorkerDocument.id == document_id,
            WorkerDocument.worker_id == worker_id,
        )
    )
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.verification_status = payload.status
    doc.verified_by = current.id
    doc.verified_at = datetime.now(timezone.utc)
    doc.rejection_reason = payload.reason if payload.status == "rejected" else None
    await db.commit()
    return {"reviewed": True, "verification_status": doc.verification_status}


@router.post("/workers/{worker_id}/background-check")
async def record_background_check(
    worker_id: UUID,
    payload: BackgroundCheckRequest,
    current: CurrentUser = Depends(require_roles(UserRole.admin_ops, UserRole.admin_super)),
    db: AsyncSession = Depends(get_db),
):
    if payload.status not in ("in_progress", "passed", "failed"):
        raise HTTPException(status_code=400, detail="Invalid background check status")
    res = await db.execute(select(WorkerProfile).where(WorkerProfile.id == worker_id))
    wp = res.scalar_one_or_none()
    if not wp:
        raise HTTPException(status_code=404, detail="Worker not found")
    wp.background_check_status = payload.status
    if payload.status == "failed":
        wp.onboarding_status = WorkerOnboardingStatus.rejected
        wp.onboarding_rejection_reason = payload.reason or "Background check failed"
        wp.onboarding_reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    return {"background_check_status": wp.background_check_status}


@router.post("/workers/{worker_id}/reject")
async def reject_worker(
    worker_id: UUID,
    payload: WorkerRejectionRequest,
    current: CurrentUser = Depends(require_roles(UserRole.admin_ops, UserRole.admin_super)),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(WorkerProfile).where(WorkerProfile.id == worker_id))
    wp = res.scalar_one_or_none()
    if not wp:
        raise HTTPException(status_code=404, detail="Worker not found")
    wp.onboarding_status = WorkerOnboardingStatus.rejected
    wp.onboarding_reviewed_at = datetime.now(timezone.utc)
    wp.onboarding_rejection_reason = payload.reason.strip()
    wp.availability = "offline"
    await db.commit()
    return {"rejected": True}


@router.post("/workers/{worker_id}/suspend")
async def suspend_worker(
    worker_id: UUID,
    reason: str,
    current: CurrentUser = Depends(require_roles(UserRole.admin_super)),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(WorkerProfile, User).join(User, User.id == WorkerProfile.user_id).where(WorkerProfile.id == worker_id))
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Worker not found")
    wp, user = row
    wp.onboarding_status = WorkerOnboardingStatus.suspended
    user.status = UserStatus.suspended
    await db.commit()
    return {"suspended": True}


@router.get("/financial/ledger")
async def ledger(
    booking_id: Optional[UUID] = None,
    worker_id: Optional[UUID] = None,
    consumer_id: Optional[UUID] = None,
    limit: int = 100,
    current: CurrentUser = Depends(require_roles(UserRole.admin_finance, UserRole.admin_ops, UserRole.admin_super)),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(FinancialLedger).order_by(FinancialLedger.created_at.desc()).limit(limit)
    if booking_id:
        stmt = stmt.where(FinancialLedger.booking_id == booking_id)
    if worker_id:
        stmt = stmt.where(FinancialLedger.worker_id == worker_id)
    if consumer_id:
        stmt = stmt.where(FinancialLedger.consumer_id == consumer_id)
    res = await db.execute(stmt)
    return [
        {
            "id": str(e.id),
            "entry_type": e.entry_type.value,
            "amount": float(e.amount),
            "currency": e.currency,
            "debit_account": e.debit_account,
            "credit_account": e.credit_account,
            "booking_id": str(e.booking_id) if e.booking_id else None,
            "worker_id": str(e.worker_id) if e.worker_id else None,
            "consumer_id": str(e.consumer_id) if e.consumer_id else None,
            "description": e.description,
            "created_at": e.created_at.isoformat(),
        }
        for e in res.scalars().all()
    ]


@router.post("/rematch/{booking_id}")
async def rematch_booking(
    booking_id: UUID,
    current: CurrentUser = Depends(require_roles(UserRole.admin_ops, UserRole.admin_super)),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Booking).where(Booking.id == booking_id))
    b = res.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Not found")
    b.worker_id = None
    b.status = BookingStatus.rematch_pending
    b.rematch_count += 1
    await db.commit()
    return {"rematch_initiated": True, "attempt": b.rematch_count}
@router.get("/patients")
async def admin_list_patients(
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not is_admin(current.role):
        raise HTTPException(status_code=403, detail="Admin only")

    stmt = (
        select(Patient, ConsumerProfile, User)
        .join(ConsumerProfile, ConsumerProfile.id == Patient.consumer_id)
        .join(User, User.id == ConsumerProfile.user_id)
        .order_by(Patient.created_at.desc())
    )
    res = await db.execute(stmt)

    items = []
    for patient, profile, user in res.all():
        age = None
        if patient.date_of_birth:
            today = date.today()
            age = today.year - patient.date_of_birth.year - (
                (today.month, today.day) < (patient.date_of_birth.month, patient.date_of_birth.day)
            )
        items.append({
            "id": str(patient.id),
            "full_name": patient.full_name,
            "age": age,
            "gender": patient.gender.value if patient.gender else None,
            "phone_e164": user.phone_e164,
            "city": profile.city,
            "care_plan": None,
            "is_bpl": False,
        })
    return items


@router.get("/consumers")
async def admin_list_consumers(
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not is_admin(current.role):
        raise HTTPException(status_code=403, detail="Admin only")

    stmt = (
        select(ConsumerProfile, User)
        .join(User, User.id == ConsumerProfile.user_id)
        .order_by(User.full_name)
    )
    res = await db.execute(stmt)

    return [
        {
            "id": str(profile.id),
            "full_name": user.full_name,
            "phone": user.phone_e164,
        }
        for profile, user in res.all()
    ]