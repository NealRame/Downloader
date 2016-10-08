const each = require('async/eachSeries');
const fs = require('fs');
const fsextra = require('fs.extra');
const is_nil = require('lodash.isnil');

function nodify(resolve, reject) {
	return (err, ...rest) => {
		if (is_nil(err)) {
			resolve(...rest);
		} else {
			reject(err);
		}
	};
}

function make_promise(fn, ...args) {
	return new Promise((resolve, reject) => {
		fn(...args, nodify(resolve, reject));
	})
}

function each_series(collection, task) {
	return new Promise((resolve, reject) => {
		each(
			collection,
			(item, next) => task(item).then(() => next(), next),
			nodify(resolve, reject)
		);
	});
}

function mkdir(dir_path) {
	return make_promise(fs.stat, dir_path)
		.then((stats) => {
			if (stats.isDirectory()) {
				return Promise.resolve();
			}
			throw new Error(`${dir_path} exists but is not a directory!`);
		})
		.catch((err) => {
			if (err.code === 'ENOENT') {
				return make_promise(fsextra.mkdirp, dir_path);
			}
			throw err;
		});
}

module.exports = {
	eachSeries: each_series,
	mkdir
};
