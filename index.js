const pkg = require('./package.json');
const path = require('path');
const optimist = require('optimist');

const common = require('./common');
const core = require('./core');
const ui = require('./ui');

const argv = optimist
	.usage(`Usage: ${pkg.name} [OPTIONS] REMOTE_DIR_URL`)
	.wrap(80)
	.options('h', {
		alias: 'help',
		boolean: true,
		describe: 'print this help and return.'
	})
	.options('o', {
		alias: 'output-dir',
		default: process.cwd(),
		describe: 'set output directory.'
	})
	.options('p', {
		alias: 'show-progress',
		boolean: true,
		describe: 'display a progress bar.'
	})
	.options('V', {
		alias: 'version',
		boolean: true,
		describe: 'print the version and return.'
	})
	.argv;

function get_progress_bar_builder() {
	if (argv['show-progress']) {
		return ui.makeProgressBar;
	}
}

if (argv.help) {
	optimist.showHelp();
	process.exit(0);
}

if (argv.version) {
	console.log(pkg.version);
	process.exit(0);
}

const [base_url] = argv._;
const output_dir = argv['output-dir'];

common.mkdir(output_dir)
	.then(() => core.fetchRemoteDir(base_url))
	.then((links) => {
		return common.eachSeries(
			links,
			(link) => {
				const remote_file_url = `${base_url}/${link}`;
				const output_file = path.join(output_dir, path.basename(link));
				console.log(`-- downloading ${link}`);
				return core.download(remote_file_url, output_file, get_progress_bar_builder());
			}
		);
	})
	.catch(err => console.error(err));
