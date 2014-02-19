# -*- coding: utf-8 -*-
#
# backend - query/update graphs for the Commons Machinery metadata catalog
#
# Copyright 2014 Commons Machinery http://commonsmachinery.se/
#
# Distributed under an AGPLv3 license, please see LICENSE in the top dir.

from celery import Celery
from celery import Task
from celery.signals import worker_shutdown
from catalog.store import RedlandStore

app = Celery('catalog_backend', broker='amqp://guest@localhost:5672//')

app.conf.update(
    CELERY_TASK_SERIALIZER='json',
    CELERY_ACCEPT_CONTENT = ['json'],
    CELERY_RESULT_SERIALIZER='json',
    CELERY_RESULT_BACKEND = 'amqp',
    CELERY_TASK_RESULT_EXPIRES = 30,
    CELERY_TASK_RESULT_DURABLE = False,
    CELERY_IMPORTS = ("catalog.store", "catalog_backend"),
)

class FileLock(object):
    def __init__(self, id, timeout=60):
        self._filename = 'lock-%s' % id

        while os.access(self._filename, os.R_OK) and timeout > 0:
            time.sleep(1)
            timeout -= 1

        if (not os.access(self._filename, os.R_OK)):
            self._f = open(self._filename, "w")
        else:
            raise RuntimeError("Timeout error while trying to lock access to work")

    def release(self):
        self._f.close()
        os.remove(self._filename)

class StoreTask(app.Task):
    abstract = True
    _main_store = None
    _public_store = None

    @property
    def main_store(self):
        if self._main_store is None:
            self._main_store = RedlandStore("works")
        return self._main_store

    @property
    def public_store(self):
        if self._public_store is None:
            self._public_store = RedlandStore("public")
        return self._public_store


@app.task(base=StoreTask)
def create_work(**kwargs):
    work_id = create_work.main_store.store_work(**kwargs)
    return { 'id': work_id }

@app.task(base=StoreTask)
def update_work(**kwargs):
    id = kwargs['id']
    lock = FileLock(id)
    return update_work.main_store.update_work(**kwargs)
    lock.release()

@app.task(base=StoreTask)
def delete_work(**kwargs):
    id = kwargs['id']
    lock = FileLock(id)
    return delete_work.main_store.delete_work(**kwargs)
    lock.release()

@app.task(base=StoreTask)
def get_work(**kwargs):
    return create_work.main_store.get_work(**kwargs)

@app.task(base=StoreTask)
def get_works(**kwargs):
    return create_work.main_store.query_works_simple(**kwargs)
