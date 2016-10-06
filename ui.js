const is_nil = require('lodash.isnil');
const ProgressBar = require('progress');

function make_progress_bar(total) {
	const progress = new ProgressBar('[:bar] :percent :etas', {
		clear: true,
		complete: '=',
		incomplete: ' ',
		width: '80',
		total
	});
	return count => progress.tick(is_nil(count) ? 1 : count);
}

module.exports = {
	makeProgressBar: make_progress_bar
};
