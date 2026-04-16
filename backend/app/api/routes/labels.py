from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import AuthDep, SessionDep
from app.models.label import Label
from app.schemas.label import LabelResponse

router = APIRouter(prefix="/labels", tags=["labels"])


@router.get("", response_model=list[LabelResponse])
def list_labels(db: SessionDep, _auth: AuthDep) -> list[LabelResponse]:
    labels = db.query(Label).order_by(Label.kind.asc(), Label.name.asc()).all()
    return [LabelResponse(name=label.name, kind=label.kind) for label in labels]
