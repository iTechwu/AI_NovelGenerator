import importlib


def test_architecture_runtime_import_does_not_eagerly_load_optional_retrieval_dependencies() -> None:
    generator = importlib.import_module('novel_generator')

    assert callable(generator.Novel_architecture_generate)
    assert callable(generator.Chapter_blueprint_generate)
