const fs = require('fs');
const http = require('http');
const jquery = require('jquery');
const jsdom = require('jsdom');
const once = require('lodash.once');
const path = require('path');
const stream_buffers = require('stream-buffers');
const each_async = require('async/eachSeries');

function exist(v) {
	return v != null;
}

function nodify(resolve, reject) {
	return (err, ...rest) => {
		console.log(`err: ${err}`);
		if (exist(err)) {
			reject(err);
		} else {
			resolve(...rest);
		}
	};
}

function promisify(fn) {
	return (...args) => new Promise((resolve, reject) => {
		fn(...args, nodify(resolve, reject));
	});
}

function get_async(options) {
	return new Promise((resolve, reject) => {
		const req = http.get(options);
		req
			.on('error', once(reject))
			.on('response', once(resolve));
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
			if (err) {
				reject(err);
			} else {
				jquery(window);
				resolve(window);
			}
		});
	});
}

function download(base_url, prefix) {
	return get_async(`${base_url}/${prefix}`)
		.then(res => {
			return new Promise((resolve, reject) => {
				const filename = path.basename(prefix);
				res
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
				download(base_url, link)
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
