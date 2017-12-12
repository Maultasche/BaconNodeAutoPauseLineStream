const stream = require('stream');
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
	
	/**
	 * Tests the line stream with a particular set of test data
	 *
	 * @param data - a string containing the text to use as test data
	 */
	function testLineStreamWithData(data) {
		//We have to wrap all this in a promise so that the test runner
		//will wait until the asynchronous code has had a chance to complete
		return new Promise((resolve, reject) => {
			//Create the readable Node.js stream
			const readStream = new stream.Readable();
			readStream._read = () => {};
			readStream.push(data);
			readStream.push(null);
			
			//Break the string apart into lines so that we can compare the 
			//expected lines vs the actual lines emitted by the Bacon stream
			//We also need to remove any empty strings from the end of the expected
			//lines, since those won't be emitted
			let expectedLines = data.split('\n')
				.reduce((array, item, index, originalArray) => {
					if(item !== "" || index !== originalArray.length - 1) {
						array.push(item);
					}
					
					return array;
				}, []);
			
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
		const readStream = new stream.Readable();
		readStream._read = () => {};
		readStream.push(data);
		readStream.push(null);
		
		//Break the string apart into lines so that we can compare the 
		//expected lines vs the actual lines emitted by the Bacon stream
		//We also need to remove any empty strings from the end of the expected
		//lines, since those won't be emitted
		let expectedLines = data.split('\n')
			.reduce((array, item, index, originalArray) => {
				if(item !== "" || index !== originalArray.length - 1) {
					array.push(item);
				}
				
				return array;
			}, []);
		
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
});