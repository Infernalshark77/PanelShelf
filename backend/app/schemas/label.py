from __future__ import annotations

from pydantic import BaseModel


class LabelResponse(BaseModel):
    name: str
    kind: str
