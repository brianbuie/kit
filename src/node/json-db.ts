import { mergeWith } from 'lodash-es';
import { File } from './file.ts';
import { FileJson } from './file-json.ts';

/**
 * A **Quick and Dirty** way to store and update an array of json objects, without managing a full SQL db.
 *
 * ⚠️ This doesn't handle file locking, concurrent writes, or any other important database features. Use an actual database for anything critical.
 */
export class JsonDb<Item extends { id: string | number }> {
  file;

  constructor(fileInput: string | File | FileJson<Item[]>) {
    this.file =
      fileInput instanceof FileJson
        ? fileInput
        : (typeof fileInput === 'string' ? new File(fileInput) : fileInput).json<Item[]>();
  }

  get items() {
    return this.file.read() ?? [];
  }

  get ids() {
    return new Set(this.items.map(i => i.id));
  }

  item = (id: Item['id']) => {
    return this.items.find(i => i.id === id);
  };

  insert = (item: Item) => {
    if (this.ids.has(item.id)) throw new Error(`Item with id ${item.id} already exists`);
    this.file.write([...this.items, item]);
  };

  insertMany = (items: Item[]) => {
    this.file.write(this.items.concat(items.filter(i => !this.ids.has(i.id))));
  };

  update = (item: Item) => {
    if (!this.ids.has(item.id)) throw new Error(`Item with id ${item.id} does not exist`);
    this.file.write(
      this.items.map(i =>
        i.id !== item.id
          ? i
          : mergeWith(i, item, (old, newVal) => {
              if (Array.isArray(old)) return newVal;
            }),
      ),
    );
  };

  upsert = (item: Item) => {
    this.ids.has(item.id) ? this.update(item) : this.insert(item);
  };

  replace = (item: Item) => {
    this.ids.has(item.id) ? this.file.write(this.items.map(i => (i.id === item.id ? item : i))) : this.insert(item);
  };

  delete = (id: Item['id']) => {
    this.file.write(this.items.filter(i => i.id !== id));
  };
}
