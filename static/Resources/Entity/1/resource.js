// Entity: anything that can own part of the tree. User and Population extend it.
const Crypto = await Network.loadResource("Crypto", 1);

class Entity {
	// record is the entity's public info: { id, type, name, scheme, publicKey }.
	// A privateKey is only present on your own entities and never goes in the tree.
	constructor(record) {
		Object.assign(this, record);
	}

	// Makes a new entity with a fresh key pair. `this.name` is the class name, e.g. "User".
	static async create(id, name, scheme = "Ed25519") {
		const keys = await Crypto.schemes[scheme].generate();
		return new this({ id, type: this.name, name, scheme, publicKey: keys.publicKey, privateKey: keys.privateKey });
	}

	// Turns a record from the tree back into the right class.
	static from(record) {
		const Type = types[record.type] || Entity;
		return new Type(record);
	}

	// The public info, safe to put in an "owner" property.
	record() {
		const { privateKey, ...record } = this;
		return record;
	}

	async sign(text) {
		if (!this.privateKey) throw new Error(`No private key for "${this.id}"`);
		return Crypto.schemes[this.scheme].sign(this.privateKey, text);
	}

	async verify(text, signature) {
		const scheme = Crypto.schemes[this.scheme];
		if (!scheme || !signature) return false;
		return scheme.verify(this.publicKey, text, signature);
	}
}

class User extends Entity {}

// A group of entities. Its members are listed under "members" in its own branch.
// For now it has one key pair, held by whoever runs it.
class Population extends Entity {}

const types = { Entity, User, Population };

return types;
