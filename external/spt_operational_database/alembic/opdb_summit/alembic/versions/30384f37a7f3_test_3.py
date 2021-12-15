"""test 3

Revision ID: 30384f37a7f3
Revises: 583bc21c4e6f
Create Date: 2020-10-12 12:27:19.646097

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '30384f37a7f3'
down_revision = '583bc21c4e6f'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('sps_exposure', 'exptime2', new_column_name='exptime')
    op.drop_constraint('sps_exposure_test_fkey', 'sps_exposure', type_='foreignkey')
    op.drop_column('sps_exposure', 'test')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('sps_exposure', 'exptime', new_column_name='exptime2')
    op.add_column('sps_exposure', sa.Column('test', sa.INTEGER(), autoincrement=False, nullable=True, comment='beam switch mode id'))
    op.create_foreign_key('sps_exposure_test_fkey', 'sps_exposure', 'beam_switch_mode', ['test'], ['beam_switch_mode_id'])
    # ### end Alembic commands ###
