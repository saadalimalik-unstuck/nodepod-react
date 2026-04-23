export const serverFile = `
import express from 'express';

const app = express();

app.get('/', (req, res) => {
    // res.send('Hello from server!');
    res.sendFile('/app/index.html');
});

app.listen(3000, () => {
    console.log('App started listening on port 3000');
});
`;

export const htmlFile = `
<html>
    <head></head>
    <body>
        <h1>Hello</h1>
        <script>
            console.log('Hello from iframe!');
            alert('Iframe Loaded!!!');
        </script>
    </body>
</html>
`;
