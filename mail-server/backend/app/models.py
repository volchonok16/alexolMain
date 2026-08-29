from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    telegram = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    calendar_feed_token = Column(String, unique=True, nullable=True, index=True)

    emails = relationship("Email", back_populates="user", cascade="all, delete-orphan")
    templates = relationship(
        "EmailTemplate",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    organized_events = relationship(
        "CalendarEvent",
        back_populates="organizer",
        cascade="all, delete-orphan",
    )


class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    from_address = Column(String, nullable=False)
    to_address = Column(String, nullable=False)
    from_name = Column(String, nullable=True)
    to_name = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    body = Column(Text, nullable=True)
    html_body = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False)
    is_sent = Column(Boolean, default=False)
    received_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="emails")


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # e.g. 'body', 'signature', 'other'
    description = Column(String, nullable=True)
    html_content = Column(Text, nullable=False)
    # Shared org templates visible to everyone; private = owner only
    is_shared = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="templates")


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    start_at = Column(DateTime, nullable=False, index=True)
    end_at = Column(DateTime, nullable=False)
    all_day = Column(Boolean, default=False, nullable=False)
    is_company = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organizer = relationship("User", back_populates="organized_events")
    attendees = relationship(
        "CalendarAttendee",
        back_populates="event",
        cascade="all, delete-orphan",
    )
    busy_slots = relationship(
        "CalendarBusySlot",
        back_populates="event",
        cascade="all, delete-orphan",
    )


class CalendarAttendee(Base):
    __tablename__ = "calendar_attendees"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("calendar_events.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    email = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    status = Column(String, default="accepted", nullable=False)

    event = relationship("CalendarEvent", back_populates="attendees")
    user = relationship("User")


class CalendarBusySlot(Base):
    """Occupied time for a mailbox while a meeting is on the calendar."""

    __tablename__ = "calendar_busy"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("calendar_events.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    email = Column(String, nullable=False, index=True)
    start_at = Column(DateTime, nullable=False, index=True)
    end_at = Column(DateTime, nullable=False, index=True)
    title = Column(String, nullable=False)
    is_busy = Column(Boolean, default=True, nullable=False)

    event = relationship("CalendarEvent", back_populates="busy_slots")
    user = relationship("User")

