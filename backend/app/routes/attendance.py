from fastapi import APIRouter, Query

from ..db import clear_attendance, list_attendance

router = APIRouter()


@router.get("")
def get_attendance(date: str | None = Query(None, description="Filter by UTC day YYYY-MM-DD")):
    rows = list_attendance(date_filter=date)
    return {"entries": rows}


@router.delete("")
def delete_all_attendance():
    clear_attendance()
    return {"ok": True}
