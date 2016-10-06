const path = require('path');

const common = require('./common');
const core = require('./core');
const ui = require('./ui');

const base_url = process.argv[2];

core.fetchRemoteDir(base_url)
	.then((links) => {
		return common.eachSeries(
			links,
			(link) => {
				const remote_file_url = `${base_url}/${link}`;
				const output_file = path.basename(link);
				console.log(`-- downloading ${link}`);
				return core.download(remote_file_url, output_file, ui.makeProgressBar);
			}
		);
	})
	.catch(err => console.error(err));
