const each_async = require('async/eachSeries');
const fs = require('fs');
const http = require('http');
const is_nil = require('lodash.isnil');
const jquery = require('jquery');
const jsdom = require('jsdom');
const noop = require('lodash.noop');
const once = require('lodash.once');
const path = require('path');
const ProgressBar = require('progress');
const stream_buffers = require('stream-buffers');

function get_async(options) {
	return new Promise((resolve, reject) => {
		const req = http.get(options);
		req
			.on('error', once(reject))
			.on('response', once(res => resolve(res, req)));
	});
}

function response_to_html(res) {
	return new Promise((resolve, reject) => {
		const output_buffered_stream = new stream_buffers.WritableStreamBuffer();
		res
			.pipe(output_buffered_stream)
			.on('error', reject)
			.on('finish', () => {
				resolve(output_buffered_stream.getContentsAsString('utf8'));
			});
	});
}

function html_to_dom(html) {
	return new Promise((resolve, reject) => {
		jsdom.env(html, (err, window) => {
			if (is_nil(err)) {
				jquery(window);
				resolve(window);
			} else {
				reject(err);
			}
		});
	});
}

function make_progress_bar(enabled, total) {
	if (enabled) {
		const progress = new ProgressBar('[:bar] :percent :etas', {
			clear: true,
			complete: '=',
			incomplete: ' ',
			width: '80',
			total
		});
		return count => progress.tick(is_nil(count) ? 1 : count);
	}
	return noop;
}

function download(base_url, prefix, show_progress = false) {
	return get_async(`${base_url}/${prefix}`)
		.then((res, req) => {
			const total_len = parseInt(res.headers['content-length'], 10);
			const progress_enabled = show_progress && !Number.isNaN(total_len);
			const progress = make_progress_bar(progress_enabled, total_len);
			return new Promise((resolve, reject) => {
				const filename = path.basename(prefix);
				res
					.on('data', (chunk) => progress(chunk.length))
					.pipe(fs.createWriteStream(filename))
					.on('error', reject)
					.on('finish', resolve);
			});
		});
}

const base_url = process.argv[2];

get_async(base_url)
	.then(res => response_to_html(res))
	.then(html => html_to_dom(html))
	.then(window => {
		const $ = window.$;
		return $('a')
			.map((index, link) => {
				return $(link).attr('href');
			})
			.filter((index, href) => /^.+\.mkv$/i.test(href))
			.toArray()
	})
	.then((links) => {
		each_async(
			links,
			(link, next) => {
				console.log(`-- downloading ${link}`);
				download(base_url, link, true)
					.then(() => {
						console.log('-- done');
						next();
					})
					.catch(next);
			},
			(err) => {
				console.error(err);
			}
		)
	})
	.catch(err => console.error(err));
