"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2026-11-12
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

from app.domain.events import trigger_statements


revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:

    op.create_table('checklist_rules',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('product', sa.String(length=64), nullable=False),
    sa.Column('applicant_type', sa.String(length=64), nullable=False),
    sa.Column('loan_band', sa.String(length=32), nullable=False),
    sa.Column('category', sa.String(length=80), nullable=False),
    sa.Column('category_order', sa.Integer(), nullable=False),
    sa.Column('doc_name', sa.String(length=200), nullable=False),
    sa.Column('owner', sa.String(length=32), nullable=False),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('staff',
    sa.Column('id', sa.String(length=32), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('role', sa.String(length=32), nullable=False),
    sa.Column('title', sa.String(length=120), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('applications',
    sa.Column('id', sa.String(length=16), nullable=False),
    sa.Column('client_name', sa.String(length=160), nullable=False),
    sa.Column('city', sa.String(length=80), nullable=False),
    sa.Column('product', sa.String(length=64), nullable=False),
    sa.Column('applicant_type', sa.String(length=64), nullable=False),
    sa.Column('loan_band', sa.String(length=32), nullable=False),
    sa.Column('contact_name', sa.String(length=120), nullable=False),
    sa.Column('contact_email', sa.String(length=160), nullable=False),
    sa.Column('rm_id', sa.String(length=32), nullable=False),
    sa.Column('analyst_id', sa.String(length=32), nullable=True),
    sa.Column('opened_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('rule_version', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['analyst_id'], ['staff.id'], ),
    sa.ForeignKeyConstraint(['rm_id'], ['staff.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('analyst_requests',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('application_id', sa.String(length=16), nullable=False),
    sa.Column('analyst_id', sa.String(length=32), nullable=False),
    sa.Column('rm_id', sa.String(length=32), nullable=False),
    sa.Column('item_ids', sa.JSON(), nullable=False),
    sa.Column('note', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['analyst_id'], ['staff.id'], ),
    sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ),
    sa.ForeignKeyConstraint(['rm_id'], ['staff.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('analyst_requests', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_analyst_requests_application_id'), ['application_id'], unique=False)

    op.create_table('events',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('event_type', sa.String(length=32), nullable=False),
    sa.Column('application_id', sa.String(length=16), nullable=True),
    sa.Column('actor_id', sa.String(length=32), nullable=False),
    sa.Column('actor_name', sa.String(length=120), nullable=False),
    sa.Column('actor_role', sa.String(length=32), nullable=False),
    sa.Column('reason', sa.Text(), nullable=False),
    sa.Column('payload', sa.JSON(), nullable=False),
    sa.Column('prev_hash', sa.String(length=64), nullable=False),
    sa.Column('hash', sa.String(length=64), nullable=False),
    sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('hash')
    )
    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_events_application_id'), ['application_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_events_event_type'), ['event_type'], unique=False)
        batch_op.create_index(batch_op.f('ix_events_occurred_at'), ['occurred_at'], unique=False)

    # The event log is append-only: reject UPDATE and DELETE at the database level.
    for stmt in trigger_statements(op.get_bind().dialect.name):
        op.execute(stmt)

    op.create_table('reminders',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('application_id', sa.String(length=16), nullable=False),
    sa.Column('named_rm_id', sa.String(length=32), nullable=False),
    sa.Column('round', sa.Integer(), nullable=False),
    sa.Column('due_date', sa.Date(), nullable=False),
    sa.Column('item_ids', sa.JSON(), nullable=False),
    sa.Column('template_body', sa.Text(), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('state', sa.String(length=16), nullable=False),
    sa.Column('created_by', sa.String(length=120), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('revision', sa.Integer(), nullable=False),
    sa.Column('ai_assisted', sa.Boolean(), nullable=False),
    sa.Column('approved_by', sa.String(length=32), nullable=True),
    sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('scheduled_for', sa.DateTime(timezone=True), nullable=True),
    sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ),
    sa.ForeignKeyConstraint(['approved_by'], ['staff.id'], ),
    sa.ForeignKeyConstraint(['named_rm_id'], ['staff.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('reminders', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_reminders_application_id'), ['application_id'], unique=False)

    op.create_table('document_items',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('application_id', sa.String(length=16), nullable=False),
    sa.Column('category', sa.String(length=80), nullable=False),
    sa.Column('category_order', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('owner', sa.String(length=32), nullable=False),
    sa.Column('state', sa.String(length=16), nullable=False),
    sa.Column('requested_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('due_date', sa.Date(), nullable=False),
    sa.Column('round', sa.Integer(), nullable=False),
    sa.Column('received_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('received_by', sa.String(length=120), nullable=True),
    sa.Column('waived_reason', sa.Text(), nullable=True),
    sa.Column('waived_by', sa.String(length=120), nullable=True),
    sa.Column('analyst_request_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['analyst_request_id'], ['analyst_requests.id'], ),
    sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('document_items', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_document_items_application_id'), ['application_id'], unique=False)




def downgrade() -> None:
    dialect = op.get_bind().dialect.name
    if dialect == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS events_no_update_delete ON events")
        op.execute("DROP FUNCTION IF EXISTS events_append_only()")
    elif dialect == "sqlite":
        op.execute("DROP TRIGGER IF EXISTS events_no_update")
        op.execute("DROP TRIGGER IF EXISTS events_no_delete")

    with op.batch_alter_table('document_items', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_document_items_application_id'))

    op.drop_table('document_items')
    with op.batch_alter_table('reminders', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_reminders_application_id'))

    op.drop_table('reminders')
    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_events_occurred_at'))
        batch_op.drop_index(batch_op.f('ix_events_event_type'))
        batch_op.drop_index(batch_op.f('ix_events_application_id'))

    op.drop_table('events')
    with op.batch_alter_table('analyst_requests', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_analyst_requests_application_id'))

    op.drop_table('analyst_requests')
    op.drop_table('applications')
    op.drop_table('staff')
    op.drop_table('checklist_rules')

