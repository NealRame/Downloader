const fs = require('fs');
const http = require('http');

const is_nil = require('lodash.isnil');
const once = require('lodash.once');
const noop = require('lodash.noop');

const jquery = require('jquery');
const jsdom = require('jsdom');

const stream_buffers = require('stream-buffers');

function http_get(options) {
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

function fetch_remote_dir(remote_dir_url) {
	return http_get(remote_dir_url)
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
}

function download(remote_file_url, dest, progress_builder) {
	return http_get(remote_file_url)
		.then((res) => {
			const total_len = parseInt(res.headers['content-length'], 10);
			const progress = !(is_nil(progress_builder) || Number.isNaN(total_len))
				? progress_builder(total_len)
				: noop;
			return new Promise((resolve, reject) => {
				res
					.on('data', (chunk) => progress(chunk.length))
					.pipe(fs.createWriteStream(dest))
					.on('error', reject)
					.on('finish', resolve);
			});
		});
}

module.exports = {
	httpGet: http_get,
	fetchRemoteDir: fetch_remote_dir,
	download
};
