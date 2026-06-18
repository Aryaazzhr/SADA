import json
import asyncio
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class DeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count

class LocalCursor:
    def __init__(self, items):
        self.items = items

    def sort(self, key_or_list, direction=None):
        # We assume key_or_list is a string like "created_at" and direction is -1 (desc) or 1 (asc)
        # If it's a list of tuples like [("created_at", -1)], handle that too
        key = key_or_list
        desc = False
        if isinstance(key_or_list, list) and len(key_or_list) > 0:
            key = key_or_list[0][0]
            direction = key_or_list[0][1]
        
        if direction == -1:
            desc = True
            
        def sort_key(x):
            return x.get(key, "")
            
        self.items.sort(key=sort_key, reverse=desc)
        return self

    def limit(self, limit_count: int):
        self.items = self.items[:limit_count]
        return self

    async def to_list(self, length: int):
        return self.items[:length]

class LocalCollection:
    def __init__(self, db, name):
        self.db = db
        self.name = name

    def _get_docs(self):
        return self.db.data.get(self.name, [])

    def _set_docs(self, docs):
        self.db.data[self.name] = docs
        self.db.save()

    def _match_query(self, doc, query):
        for k, v in query.items():
            if doc.get(k) != v:
                return False
        return True

    async def find_one(self, query, projection=None):
        # projection is ignored for simple mock
        docs = self._get_docs()
        for doc in docs:
            if self._match_query(doc, query):
                return doc.copy()
        return None

    def find(self, query=None, projection=None):
        if query is None:
            query = {}
        docs = self._get_docs()
        result = [doc.copy() for doc in docs if self._match_query(doc, query)]
        return LocalCursor(result)

    async def insert_one(self, document):
        docs = self._get_docs()
        docs.append(document.copy())
        self._set_docs(docs)
        # Mocking an insert result (which isn't strictly used in the code we saw)
        class InsertResult:
            inserted_id = "local_id"
        return InsertResult()

    async def update_one(self, query, update, upsert=False):
        docs = self._get_docs()
        for i, doc in enumerate(docs):
            if self._match_query(doc, query):
                # Process update
                if "$set" in update:
                    doc.update(update["$set"])
                if "$unset" in update:
                    for k in update["$unset"]:
                        doc.pop(k, None)
                self._set_docs(docs)
                return
        
        # Not found, handle upsert
        if upsert:
            new_doc = query.copy()
            if "$set" in update:
                new_doc.update(update["$set"])
            docs.append(new_doc)
            self._set_docs(docs)

    async def delete_one(self, query):
        docs = self._get_docs()
        for i, doc in enumerate(docs):
            if self._match_query(doc, query):
                del docs[i]
                self._set_docs(docs)
                return DeleteResult(1)
        return DeleteResult(0)

    async def delete_many(self, query):
        docs = self._get_docs()
        original_len = len(docs)
        docs = [doc for doc in docs if not self._match_query(doc, query)]
        deleted_count = original_len - len(docs)
        self._set_docs(docs)
        return DeleteResult(deleted_count)

class LocalDatabase:
    def __init__(self, filepath: Path):
        self.filepath = filepath
        self.data = {}
        self.load()

    def load(self):
        if self.filepath.exists():
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
                logger.info(f"Loaded local database from {self.filepath}")
            except Exception as e:
                logger.error(f"Error loading local DB: {e}. Starting fresh.")
                self.data = {}
        else:
            self.data = {}

    def save(self):
        with open(self.filepath, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2)

    def __getitem__(self, name):
        return LocalCollection(self, name)

    def __getattr__(self, name):
        return self.__getitem__(name)

    def close(self):
        self.save()
        logger.info("Local database closed and saved.")

class AsyncIOMotorClientMock:
    def __init__(self, db_dir: Path):
        self.filepath = db_dir / "local_database.json"
        self.db = LocalDatabase(self.filepath)

    def __getitem__(self, name):
        # We ignore the name and just return our single LocalDatabase instance
        return self.db

    def __getattr__(self, name):
        return self.__getitem__(name)

    def close(self):
        self.db.close()
