import {copyStyles, greeting} from './CopyStyles';
import {JSDOM} from "jsdom";

// Sample test format
describe('message is emitted when', () => {
    it('matches the specified text', () => {
        expect(greeting()).toBe('hello world');
    });
});

// First verify the number of style sheets in the target
describe('target receives the source styles when', () => {
    it('has the correct number of styles', () => {
        // Define source and target html
        let sourceHtml = `<!DOCTYPE html>
            <html lang="en">  
                <head>
                    <title>
                        iTwin Viewer React Sample
                    </title>
                    <style type="text/css">
                        p {color: #26b72b}
                    </style>  
                </head>
                <body>
                    <p>
                        This text will be green. Inline styles take precedence over CSS included externally.
                    </p>
                </body>
            </html>`
        let targetHtml = `<!DOCTYPE html> 
            <html lang="en">  
                <head>
                    <title>
                        iTwin Viewer React Sample
                    </title>  
                </head>
                <body>
                    <p>This text will be green. Inline styles take precedence over CSS included externally.</p>  
                </body>
            </html>`

        // Use JSDOM to generate source and target DOMs
        const sourceDom = new JSDOM(sourceHtml);
        const targetDom = new JSDOM(targetHtml);

        // Copy the styles into the targetDom
        copyStyles(targetDom.window.document, sourceDom.window.document);

        // Compare the style lengths
        const srcLength = sourceDom.window.document.styleSheets.length;
        const targetLength = targetDom.window.document.styleSheets.length;
        expect(srcLength).toBe(targetLength);
    });
});

