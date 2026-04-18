from pydantic import BaseModel
from typing import List
from app.schemas.info_data import InfoDataType


class VectorPoint(BaseModel):
    id: str
    vector: List[float]
    payload: InfoDataType
