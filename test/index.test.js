const stream = require('stream');
const streamify = require('stream-array');
const _ = require('lodash');

describe('testing the creation of line stream', () => {
	jest.resetModules();
	
	const createAutoPauseLineStream = require('../src/index');
	
	test('correctly streams text containing multiple lines ending without ' +
		'a newline character', () => {		
		const testData = "Gold\nSilver\nTitanium\nBronze\nNickel\nCobalt\nAlgae\nCopper";
			
		return testLineStreamWithData(testData);
	});
	
	test('correctly streams text containing multiple lines ending with ' +
		'a newline character', () => {		
		const testData = "Gold\nSilver\nTitanium\nBronze\nNickel\nCobalt\nAlgae\nCopper\n";
			
		return testLineStreamWithData(testData);
	});
	
	test('correctly streams text containing multiple lines where there are ' +
		'multiple newline characters in a row', () => {		
		const testData = "Gold\nSilver\nTitanium\n\n\nBronze\nNickel\n\nCobalt\nAlgae\nCopper\n";
			
		return testLineStreamWithData(testData);
	});
	
	test('correctly streams text containing a single line', () => {		
		const testData = "GoldSilverTitaniumBronzeNickelCobaltAlgaeCopper";
			
		return testLineStreamWithData(testData);
	});
	
	test('correctly streams empty content', () => {		
		const testData = "";
			
		return testLineStreamWithData(testData);
	});
	
	test('correctly streams a very large amount of text', () => {		
		const testData = "Gold\nSilver\nTitanium\nBronze\nNickel\nCobalt\nAlgae\nCopper";
			
		return testLineStreamWithData(testData.repeat(10000));
	});
	
	test('tests the resume functionality when we resume the stream 0 times', () => {		
		const testData = "Gold\nSilver\nTitanium\nBronze\nNickel\nCobalt\nAlgae\nCopper";
			
		return testLineStreamResumption(testData, 0);
	});
	
	test('tests the resume functionality when we resume the stream 1 times', () => {		
		const testData = "Gold\nSilver\nTitanium\nBronze\nNickel\nCobalt\nAlgae\nCopper";
			
		return testLineStreamResumption(testData, 1);
	})	
	
	test('tests the resume functionality when we resume the stream 2 times', () => {		
		const testData = "Gold\nSilver\nTitanium\nBronze\nNickel\nCobalt\nAlgae\nCopper";
			
		return testLineStreamResumption(testData, 2);
	})
	
	test('tests the resume functionality when we resume the stream 100 times', () => {		
		const testData = "Gold\nSilver\nTitanium\nBronze\nNickel\nCobalt\nAlgae\nCopper";
			
		return testLineStreamResumption(testData.repeat(50), 0);
	})
	
	describe('tests that the line stream successfully streams lines that are added to ' +
	'the stream in various chunk sizes', () => {
		const testData = "Gold\nSilver\nTitanium\nBronze\nNickel\nCobalt\nAlgae\nCopper";
		
		//Run tests with chunk sizes ranging from a single line per chunk to all the lines
		//in a single chunk
		const numOfLines = testData.split('\n').length;
		
		_.range(1, numOfLines)
			.forEach(lineCount => {
				test(`tests that the line stream successfully streams lines using chunks ` +
				`of ${numOfLines} lines`, () => {
					return testLineStreamWithChunks(testData, lineCount);
				});
			});
	});
	
	/**
	 * Tests the line stream with a particular set of test data
	 *
	 * @param data - a string containing the text to use as test data
	 */
	function testLineStreamWithData(data) {
		//Create the readable Node.js stream
		const readStream = createSingleChunkReadStream(data);
		
		//Break the string apart into lines so that we can compare the 
		//expected lines vs the actual lines emitted by the Bacon stream
		let expectedLines = calculateExpectedLines(data);
		
		return testLineStreamWithNodeStream(readStream, expectedLines);
	}
	
	/**
	 * Tests the line stream using a particular readable stream
	 *
	 * @param {Object} readStream - a Node readable stream that emits 
	 *	lines of text
	 * @param {string[]} expectedLines - an array containing the expected
	 *	lines of text that should be emitted from the line stream
	 */
	function testLineStreamWithNodeStream(readStream, expectedLines) {
		//We have to wrap all this in a promise so that the test runner
		//will wait until the asynchronous code has had a chance to complete
		return new Promise((resolve, reject) => {
			//Handle any read stream errors
			readStream.on('error', error => reject(error));
			
			//Create the Bacon line stream
			const lineStream = createAutoPauseLineStream(readStream);
			
			//Handle any line stream errors
			lineStream.onError(error => reject(error));
			
			//Read the lines from the line stream
			const actualLines = [];
			
			lineStream.onValue(({ line, resume }) => {
				actualLines.push(line);
				
				resume();
			});
			
			//When the line stream ends, compare the actual lines with the expected lines
			lineStream.onEnd(() => {
				//Verify that we have the same number of lines
				expect(actualLines.length).toBe(expectedLines.length);
				
				//Compare the lines to verify that they are the same
				_.zip(expectedLines, actualLines)
					.forEach(linePair => {
						expect(linePair[1]).toBe(linePair[0]);
					});
					
				resolve();
			});			
		});
	}
	
	/**
	 * Tests the line stream with a particular set of test data and the
	 * the autopause functionality
	 *
	 * @param {Array.<string>} data - a string containing the text to use as test data
	 * @param {number} resumeCount - The number of times to resume the stream
	 */
	function testLineStreamResumption(data, resumeCount) {
		expect(resumeCount).toBeDefined();
		
		//Create the readable Node.js stream
		const readStream = createSingleChunkReadStream(data);
		
		//Break the string apart into lines so that we can compare the 
		//expected lines vs the actual lines emitted by the Bacon stream
		let expectedLines = calculateExpectedLines(data);
		
		//Take the first N elements form the expected lines to match the number
		//times we will resume the stream
		expectedLines = _.take(expectedLines, resumeCount + 1);
		
		//Handle any read stream errors
		readStream.on('error', error => reject(error));
		
		//Create the Bacon line stream
		const lineStream = createAutoPauseLineStream(readStream);
		
		//Handle any line stream errors
		lineStream.onError(error => reject(error));
		
		//Read the lines from the line stream
		const actualLines = [];
		
		//Keep track of how many times we've resumed
		let currentResumeCount = 0;
		
		lineStream.onValue(({ line, resume }) => {
			actualLines.push(line)
			
			//If we haven't hit our resume limit, resume the stream
			if(currentResumeCount < resumeCount) {
				currentResumeCount++;
				
				resume();
			}			
		});
		
		expect.hasAssertions();
			
		//Create a promise that resolves after a time period has passed.
		return new Promise((resolve, reject) => {			
			setTimeout(() => {
				//After the time limit has passed, look at what the line stream
				//emitted vs what should have been emitted if the unpause functionality
				//is working correctly
				
				//Verify that we have the expected number of lines
				expect(actualLines.length).toBe(expectedLines.length);
				
				//Compare the lines to verify that they are the same
				_.zip(expectedLines, actualLines)
					.forEach(linePair => {
						expect(linePair[1]).toBe(linePair[0]);
					});
				
				resolve();
			}, 100);		
		});		
	}

	/**
	 * Tests the line stream with a particular set of test data broken
	 * into distinct chunks that are emitted by the read stream. This
	 * is to ensure that the stream can handle multiple chunks of data
	 * emitted by the read stream.
	 *
	 * @param {Array.<string>} data - a string containing the text to use as test data
	 * @param {number} lineCount - The number of lines of text to include
	 *  in a particular chunk emitted by the read stream
	 * @returns a promise that is resolved when the test is complete
	 */
	function testLineStreamWithChunks(data, lineCount) {
		//Chunkify the data
		const chunkedData = chunkify(data, lineCount);
		
		//Create the read stream
		const readStream = createChunkedReadStream(chunkedData);
		
		//Break the string apart into lines so that we can compare the 
		//expected lines vs the actual lines emitted by the Bacon stream
		let expectedLines = calculateExpectedLines(data);
		
		//Run the test with the read stream and expected lines
		return testLineStreamWithNodeStream(readStream, expectedLines);		
	}

	/**
	 * Breaks a string into an array of chunks, where each chunk
	 * is one or more lines of text
	 * 
	 * @param  {string} chunkString - the string to be broken into chunks
	 * @param  {number} lineCount - the number of lines in each chunk
	 * @returns {string[]} an array of string chunks
	 */
	function chunkify(chunkString, lineCount) {
		return _.chunk(chunkString.trim().split('\n'), lineCount)
			.map(chunk => chunk.join('\n') + '\n');
	}

	/**
	 * Creates a read stream from an array of strings that will result in a
	 * stream that emits one chunk of data for every item in the array
	 *
	 * @param  {string[]} stringArray - The array of strings to convert
	 *  to a readable stream
	 * @returns {Object} a read stream that will emit the contents of
	 *  stringArray
	 */
	function createChunkedReadStream(stringArray) {
		return streamify(stringArray);
	}
	
	/**
	 * Creates a read stream from single string that will result in a
	 * stream that emits one chunk of data
	 *
	 * @param  {string} stringData - The string to convert
	 *  to a readable stream
	 * @returns {Object} a read stream that will emit the contents of
	 *  stringData
	 */
	function createSingleChunkReadStream(stringData) {
		const readStream = new stream.Readable();
		readStream._read = () => {};
		readStream.push(stringData);
		readStream.push(null);		
		
		return readStream;
	}
	
	/**
	 * Calculates the expected lines from a single string containing text
	 * separated by newlines
	 * 
	 * @param {string} dataString - the string containing lines of text
	 * @returns {string[]} an array where each item is the text of an 
	 *	expected line without the newline
	 */	
	function calculateExpectedLines(dataString) {
		//We need to remove any empty strings from the end of the expected
		//lines, since those won't be emitted
		let expectedLines = dataString.split('\n')
			.reduce((array, item, index, originalArray) => {
				if(item !== "" || index !== originalArray.length - 1) {
					array.push(item);
				}
				
				return array;
			}, []);
			
		return expectedLines;
	}
});