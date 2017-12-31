const log = require('./log');
const error = require('./error');
const mysql = require('mysql');

// Convert { a: 1, b: { c: 2, d: 3 } }
//    into { a: 1, b_c: 2, b_d: 3 }
// Won't clone arrays and dates, so beware
function flatten(data, prefix = '', result = {}) {
	let keys = Object.keys(data);
	for (let key of keys) {
		let value = data[key];
		const isArray = Array.isArray(value);
		const isDate = value instanceof Date;
		const isNull = value === null;
		const isObject = typeof data[key] === 'object';
		if (isObject && !isArray && !isDate && !isNull) {
			flatten(value, prefix + key + '_', result);
		} else {
			result[prefix + key] = value;
		}
	}
	return result;
}

// Test:
// log(flatten({ a: 1, b: { c: 2, d: 3 } }));
// log(flatten({ a: 1, b: { c: 2, d: 3, xxx: { y: 'zing', box: [1,2,3], pow: new Date() } } }));

function objectToCriteria(object) {
	// log('OBJECT', object);

	let sql = Object.keys(object).map(key => {
		if (object[key] === null) {
			return `${key} IS NULL`;
		} else {
			return `\`${key}\` = ?`;
		}
	}).join(' AND ');

	// log('SQL', sql);

	let args = Object.keys(object).map(key => object[key]).filter(key => key !== null);

	// log('args', args);

	return {
		sql, args
	};
}
class Table {
	constructor(db, name) {
		this.db = db;
		this.name = name;
	}

	async select(criteria) {
		if (typeof criteria === 'object') {
			let { sql, args } = objectToCriteria(criteria);
			return await db.query(`SELECT * from \`${this.name}\` WHERE ${sql}`, ...args);
		} else if (criteria === undefined) {
			return await db.query(`SELECT * from \`${this.name}\``);
		} else {
			throw new Error('TODO implement criteria ' + criteria);
		}
	}

	async selectOne(criteria) {
		let results = await this.select(criteria);
		if (results.length > 1) {
			throw new Error('selectOne, too many results');
		}
		return results[0];
	}
	
	async insert(data) {
		data = flatten(data);

		let { insertId } = await db.query(`INSERT INTO \`${this.name}\` SET ?`, data);
		return { insertId };
	}

	async upsert(data) {
		data = flatten(data);

		let result = await db.query(`INSERT INTO \`${this.name}\` SET ? ON DUPLICATE KEY UPDATE ?`, data, data);
		let { insertId } = result;
		return { insertId };
	}

	// update(123, { key: 'value' })
	// or
	// update({ id: 123, key: 'value' })
	async update(id, data) {
		if (id === undefined) {
			error('No id');
		}

		if (data === undefined) {
			data = id;
			id = data.id;
		}

		data = flatten(data);

		let {
			affectedRows,
			changedRows,
		} = await db.query(`UPDATE \`${this.name}\` SET ? WHERE id = ?`, data, id);
		return {
			affectedRows, changedRows
		}
	}
}

class DB {
	constructor(config) {
		this.pool = mysql.createPool({
			connectionLimit: 10,
			host: config.host,
			user: config.user,
			password: config.password,
			database: 'fomobot'
		});

		this.position = this.table('position');
		// old
		this.trade = this.table('trade');
		this.order = this.table('order');
	}

	table(name) {
		return new Table(this, name);
	}

	// Call like db.query`SELECT * FROM data WHERE userId = ${userId}`
	// or like db.query('SELECT * FROM data WHERE userId = ?', userId);
	async query(sqlParts, ...args) {
		// log('sql', sqlParts, ...args);
		let sql;

		if (typeof sqlParts === 'string') {
			sql = sqlParts;
		} else {
			sql = sqlParts.join('?');
		}

		return await new Promise((resolve, reject) => {
			this.pool.getConnection((err, conn) => {
				if (err) {
					return reject(err);
				}

				conn.query(sql, args, (err, results) => {
					conn.release();

					if (err) {
						reject(err);
					}

					if (results) {
						resolve(results);
					}
				});
			})
		});
	}

	async queryOne(sqlParts, ...args) {
		let results = await this.query(sqlParts, ...args);
		if (results.length > 1) {
			throw new Error('queryOne, too many results');
		}
		return results[0];
	}
}

const config = require('./config').db;

const db = new DB(config);

module.exports = db;


