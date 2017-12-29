const Bacon = require('baconjs');
const readline = require('readline');
const Queue = require('queuejs');

/**
 * Creates a Bacon stream that emits lines of text read from a
 * readable stream. The stream pauses itself every time a line
 * is emitted and can be unpaused by calling the unpause function
 * the is emitted along with the line of text
 *
 * @param readStream - A readable stream
 * @returns a Bacon stream that emits objects containing a line of text
 *	and an unpause function
 */
function createAutoPauseLineStream(readStream) {
	//Use readline to read the lines of text
	const lineReader = readline.createInterface({
		input: readStream
	});

	//Create a line queue for the lines that are emitted from the line reader.
	//Once the line reader has read a chunk from the read stream, it will
	//continue to emit lines until it has processed the entire chunk. Pausing
	//the line reader or stream will cause them not to emit or process any more
	//chunks, but it will not immediately stop lines from being emitted. So
	//we'll store emitted lines in the line queue until it's time to emit them.
	const lineQueue = new Queue();
	
	//Keep track of whether the stream has ended
	let streamEnd = false;
	
	//Create and return the Bacon stream generator function
	return Bacon.fromBinder(sink => {
		//Keep track of whether the stream is currently paused
		let paused = false;
		
		//Set an event handler for the error events
		lineReader.on('error', error => sink(new Bacon.Error(error)));
	
		//Set an event handler for the line event
		lineReader.on('line', lineString => {
			//Add the line to the line buffer
			lineQueue.enq(lineString);

			//Pause the line reader
			readStream.pause();
			
			//If the stream is not currently paused, emit a line
			if(!paused) {
				emitLine();
			}
		});		
		
		//Set an event handler for the close event, which indicates
		//that we've read all the lines
		lineReader.on('close', () => {
			//Indicate the stream has ended
			streamEnd = true;

			//If the stream is not paused, emit a line
			if(!paused) {
				emitLine();
			}
		});	
		
		//Emits a line if possible
		function emitLine() {	
			if(lineQueue.size() > 0)
			{				
				pause();

				sink({line: lineQueue.deq(), resume});
			}
			else if(streamEnd) {
				sink(new Bacon.End());
			}
			else {
				//If we've run out of lines to emit
				readStream.resume();
			}
		}
		
		//Pauses the stream
		function pause() {
			paused = true;		
		}

		//Resumes the stream
		function resume() {
			paused = false;
			
			emitLine();
		}		
		
		return () => {};
	});
	
	
}

module.exports = createAutoPauseLineStream;