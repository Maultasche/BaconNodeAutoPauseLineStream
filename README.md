This is a package with a function that converts a Node.js readable stream to a [Bacon.js](https://baconjs.github.io/) stream that a line of text and then pauses itself. You can then call a resume() function to cause the stream to emit another line of text.

This is useful if you have multiple streams and you want to control which one will emit the next line of text rather than having all of them continually emitting lines.

Each value that is emitted from one of these autopause streams is an object with two properties, ```{ line, resume }```, where ```line``` is the line of text and ```resume``` is a function that can be called to cause the stream to emit another line of text.

So if the Node.js readable stream contains two lines of text (separated by a '\n' character), the corresponding Bacon stream will emit a single event, containing a single line of text and a resume function. After calling the resume function, the stream will emit another line of text and a resume function. Calling resume() again will cause the stream to end, because it has no more lines of text to emit.

## Installing

Via npm:

```
npm install --save bacon-node-autopause-line-stream
```

Via yarn:

```
yarn add bacon-node-autopause-line-stream
```

## Using

Here's an example of creating a readable stream from a file and then converting that to a Bacon stream.

```javascript
const createLineStream = require('bacon-node-autopause-line-stream');
const fs = require('fs');

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
```

## Running the Example

After downloading the source, you can run an example which reads from a file and outputs the contents of that file line by line:

```
yarn fileExample example/textFile.txt
```

This command runs the example/fileExample.js file and passes it the text file to read from.

You can replace "example/textFile.txt" with any text file. For example, we could output the example source file:

```
yarn fileExample example/fileExample.js
```

## Running the Tests

After downloading, install the dependencies:

```yarn install```


Then run the unit tests:

 ```yarn test```

## License

This package is licensed under the MIT license.