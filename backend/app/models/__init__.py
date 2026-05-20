# Import Base first, then all models so that SQLAlchemy sees every table
# when Base.metadata.create_all() runs.

from app.models.base import Base  # noqa: F401

from app.models.user import User  # noqa: F401
from app.models.persona import Persona  # noqa: F401
from app.models.conversation import Conversation  # noqa: F401
from app.models.message import Message  # noqa: F401
from app.models.entity import Entity  # noqa: F401
from app.models.entity_version import EntityVersion  # noqa: F401
from app.models.kg_triple import KGTriple  # noqa: F401
from app.models.conversation_summary import ConversationSummary  # noqa: F401
from app.models.token_usage import TokenUsageLog  # noqa: F401
from app.models.refresh_token import RefreshToken  # noqa: F401
