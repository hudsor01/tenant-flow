/**
 * Mock for @react-pdf/renderer
 * Used in Jest tests to avoid ES module issues with React PDF
 */

module.exports = {
	Document: jest.fn(() => null),
	Page: jest.fn(() => null),
	Text: jest.fn(() => null),
	View: jest.fn(() => null),
	Image: jest.fn(() => null),
	Link: jest.fn(() => null),
	StyleSheet: {
		create: jest.fn((styles) => styles)
	},
	PDFViewer: jest.fn(() => null),
	PDFDownloadLink: jest.fn(() => null),
	renderToStream: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-stream')),
	renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-buffer')),
	renderToString: jest.fn().mockResolvedValue('<mock-pdf-string />')
}
