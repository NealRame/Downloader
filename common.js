const each = require('async/eachSeries');
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

function each_series(collection, task) {
	return new Promise((resolve, reject) => {
		each(
			collection,
			(item, next) => task(item).then(() => next(), next),
			nodify(resolve, reject)
		);
	});
}

module.exports = {
	eachSeries: each_series
};
