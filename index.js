const fs = require('fs');
const http = require('http');
const is_nil = require('lodash.isnil');
const jquery = require('jquery');
const jsdom = require('jsdom');
const once = require('lodash.once');
const path = require('path');

const common = require('./common');
const ui = require('./ui');

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

function download(base_url, prefix, show_progress = false) {
	return get_async(`${base_url}/${prefix}`)
		.then((res) => {
			const total_len = parseInt(res.headers['content-length'], 10);
			const progress_enabled = show_progress && !Number.isNaN(total_len);
			const progress = ui.makeProgressBar(progress_enabled, total_len);
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
		return common.eachSeries(
			links,
			(link) => {
				console.log(`-- downloading ${link}`);
				return download(base_url, link, true);
			}
		);
	})
	.catch(err => console.error(err));
