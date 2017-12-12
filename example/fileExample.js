const createAutoPauseLineStream = require('../src/index');
const fs = require('fs');

if(process.argv.length < 3) {
	console.error('Please specify the name of the file to read');
}
else {
	const fileName = process.argv[2];

	//Create a read stream to read the file
	const readStream = fs.createReadStream(fileName);

	//Create a autopause bacon line stream
	const lineStream = createAutoPauseLineStream(readStream);

	//Create an error handler
	lineStream.onError(error => console.error(error));

	//Output the lines from the text file
	lineStream.onValue(({line, resume}) => {
		//Output the line of text
		console.log(line);

		//Tell the stream to resume so that it will emit more lines
		resume();
	});
}