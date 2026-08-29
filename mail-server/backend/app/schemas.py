from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    job_title: Optional[str] = None
    telegram: Optional[str] = None


class UserCreate(BaseModel):
    full_name: str
    username: str
    phone: Optional[str] = None
    job_title: Optional[str] = None
    telegram: Optional[str] = None
    password: str
    is_admin: bool = False


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    telegram: Optional[str] = None
    password: Optional[str] = None


class UserAdminUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    telegram: Optional[str] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None


class SyncUserCreate(BaseModel):
    """Provision mailbox from alexolMain admin."""
    username: str
    full_name: str
    password: str
    is_admin: bool = False
    is_active: bool = True
    phone: Optional[str] = None
    job_title: Optional[str] = None
    telegram: Optional[str] = None
    avatar_url: Optional[str] = None


class SyncUserEnsure(BaseModel):
    """Ensure mailbox exists (password required only when creating)."""
    username: str
    full_name: str
    password: Optional[str] = None
    is_admin: bool = False
    is_active: bool = True
    phone: Optional[str] = None
    job_title: Optional[str] = None
    telegram: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_base64: Optional[str] = None
    avatar_content_type: Optional[str] = None


class SyncUserUpdate(BaseModel):
    """Update mailbox from alexolMain admin (lookup by username)."""
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    telegram: Optional[str] = None
    avatar_url: Optional[str] = None
    new_username: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    phone: Optional[str]
    job_title: Optional[str] = None
    telegram: Optional[str] = None
    avatar_url: Optional[str]
    is_admin: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[UserResponse] = None


class TokenData(BaseModel):
    email: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class SsoExchangeRequest(BaseModel):
    ticket: str


class SsoTicketResponse(BaseModel):
    ticket: str
    expires_in: int


class DirectoryPerson(BaseModel):
    email: str
    full_name: str
    job_title: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    telegram: Optional[str] = None
    username: Optional[str] = None
    is_busy: bool = False
    busy_until: Optional[datetime] = None
    busy_title: Optional[str] = None


class CalendarAttendeeIn(BaseModel):
    email: str
    display_name: Optional[str] = None


class CalendarAttendeeOut(BaseModel):
    email: str
    display_name: Optional[str] = None
    status: str = "accepted"
    avatar_url: Optional[str] = None


class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_at: datetime
    end_at: datetime
    all_day: bool = False
    is_company: bool = True
    attendees: List[CalendarAttendeeIn] = Field(default_factory=list)


class BusySlotOut(BaseModel):
    email: str
    full_name: Optional[str] = None
    start_at: datetime
    end_at: datetime
    event_id: int
    title: str
    is_busy: bool = True


class BusyMapResponse(BaseModel):
    slots: List[BusySlotOut]


class CalendarEventResponse(BaseModel):
    id: int
    organizer_email: str
    organizer_name: str
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_at: datetime
    end_at: datetime
    all_day: bool
    is_company: bool
    attendees: List[CalendarAttendeeOut] = Field(default_factory=list)
    can_edit: bool = False
    conflicts: List[BusySlotOut] = Field(default_factory=list)


class CalendarFeedUrlResponse(BaseModel):
    url: str
    token: str


class EmailCreate(BaseModel):
    to_address: str
    subject: str
    body: str
    html_body: Optional[str] = None


class EmailResponse(BaseModel):
    id: int
    from_address: str
    to_address: str
    subject: Optional[str]
    body: Optional[str]
    html_body: Optional[str]
    is_read: bool
    is_sent: bool
    received_at: datetime
    from_avatar_url: Optional[str] = None
    to_avatar_url: Optional[str] = None
    from_name: Optional[str] = None
    to_name: Optional[str] = None

    class Config:
        from_attributes = True


class EmailTemplateBase(BaseModel):
    name: str
    type: str  # 'body' | 'signature' | 'other'
    description: Optional[str] = None
    html_content: str
    # Only admins may set True; regular users always get private templates
    is_shared: bool = False


class EmailTemplateCreate(EmailTemplateBase):
    pass


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    html_content: Optional[str] = None
    is_shared: Optional[bool] = None


class EmailTemplateResponse(BaseModel):
    id: int
    user_id: int
    name: str
    type: str
    description: Optional[str]
    html_content: str
    is_shared: bool = False
    is_mine: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

