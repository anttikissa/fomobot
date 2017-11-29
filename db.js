const log = require('./log');
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
		const isObject = typeof data[key] === 'object';
		if (isObject && !isArray && !isDate) {
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

class Table {
	constructor(db, name) {
		this.db = db;
		this.name = name;
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

	async update(id, data) {
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
		this.trade = this.table('trade');
	}

	table(name) {
		return new Table(this, name);
	}

	// Call like db.query`SELECT * FROM data WHERE userId = ${userId}`
	// or like db.query('SELECT * FROM data WHERE userId = ?', userId);
	async query(sqlParts, ...args) {
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
}

const config = require('./config').db;

const db = new DB(config);

module.exports = db;


