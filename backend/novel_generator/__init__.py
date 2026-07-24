# novel_generator/__init__.py
from .architecture import Novel_architecture_generate
from .blueprint import Chapter_blueprint_generate

__all__ = [
    'Novel_architecture_generate',
    'Chapter_blueprint_generate',
    'get_last_n_chapters_text',
    'summarize_recent_chapters',
    'get_filtered_knowledge_context',
    'build_chapter_prompt',
    'generate_chapter_draft',
    'finalize_chapter',
    'enrich_chapter_text',
    'import_knowledge_file',
    'clear_vector_store',
]

_LAZY_EXPORTS = {
    'get_last_n_chapters_text': ('.chapter', 'get_last_n_chapters_text'),
    'summarize_recent_chapters': ('.chapter', 'summarize_recent_chapters'),
    'get_filtered_knowledge_context': ('.chapter', 'get_filtered_knowledge_context'),
    'build_chapter_prompt': ('.chapter', 'build_chapter_prompt'),
    'generate_chapter_draft': ('.chapter', 'generate_chapter_draft'),
    'finalize_chapter': ('.finalization', 'finalize_chapter'),
    'enrich_chapter_text': ('.finalization', 'enrich_chapter_text'),
    'import_knowledge_file': ('.knowledge', 'import_knowledge_file'),
    'clear_vector_store': ('.vectorstore_utils', 'clear_vector_store'),
}


def __getattr__(name: str):
    module_path, attribute = _LAZY_EXPORTS.get(name, (None, None))
    if not module_path:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

    from importlib import import_module

    value = getattr(import_module(module_path, __name__), attribute)
    globals()[name] = value
    return value
