# I test importano app.py e manage_users.py dalla cartella principale del progetto.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
