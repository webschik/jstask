var maxWorkersCount = typeof navigator !== 'undefined' && navigator.hardwareConcurrency || 4;
var invalidWorker = `Can't run the worker`;
var queue = [];
var createdWorkersCount = 0;

function done (worker) {
    worker.terminate();
    createdWorkersCount--;
    processQueue();
}

function processQueue () {
    if (createdWorkersCount < maxWorkersCount) {
        var taskOptions = queue.shift();

        if (!taskOptions) {
            return;
        }

        createdWorkersCount++;
        var worker = new Worker(taskOptions.url);

        worker.onmessage = function (e) {
            var data = e.data || {};

            if (data.error) {
                this.onerror(data.error);
                taskOptions = null;
                return;
            }

            if (typeof taskOptions.resolve === 'function') {
                taskOptions.resolve(data.result);
            }

            taskOptions = null;
            done(this);
        };

        worker.onerror = function () {
            if (typeof taskOptions.reject === 'function') {
                taskOptions.reject(new Error(invalidWorker));
            }

            taskOptions = null;
            done(this);
        };

        worker.postMessage(taskOptions.data);
    }
}

/**
 * @constructor
 * @param url {String}
 * @param data {Object}
 * @param resolve {Function}
 * @param reject {Function}
 */
module.exports = {
    run: function (url, data, resolve, reject) {
        queue.push({
            token: Date.now(),
            url,
            data,
            resolve,
            reject
        });
        processQueue();
    }
};