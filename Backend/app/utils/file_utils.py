def save_file(file_path: str, content: str) -> None:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def load_file(file_path: str) -> str:
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

def delete_file(file_path: str) -> None:
    if os.path.exists(file_path):
        os.remove(file_path)

def file_exists(file_path: str) -> bool:
    return os.path.exists(file_path)

def get_file_extension(file_path: str) -> str:
    return os.path.splitext(file_path)[1]