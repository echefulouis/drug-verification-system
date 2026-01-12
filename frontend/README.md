# NAFDAC Drug Verification Frontend

A React + TypeScript frontend for verifying pharmaceutical products using NAFDAC registration numbers.

## Features

- 📸 **Image Upload**: Drag & drop or click to upload product images
- 🔍 **OCR Extraction**: Automatically extracts NAFDAC numbers from images
- ✅ **Product Verification**: Verifies products against NAFDAC Greenbook database
- 🎨 **Clean UI**: Green and white color scheme for a professional look
- 📱 **Responsive**: Works on desktop and mobile devices

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **CSS3** - Styling with custom properties

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
cd frontend
npm install
```

### Development

1. Create a `.env` file from the example:

```bash
cp .env.example .env
```

2. Update the API URL in `.env` (after deploying the backend):

```
VITE_API_URL=https://your-api-gateway-url.execute-api.region.amazonaws.com/prod
```

3. Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Usage

1. **Upload Image**: Click or drag & drop a product image showing the NAFDAC number
2. **Verify**: Click the "Verify Product" button
3. **View Results**: See product details if found, or error message if not found

## API Integration

The frontend communicates with the backend API:

### Endpoint: `POST /verify`

**Request:**

```json
{
  "image": "base64_encoded_image",
  "contentType": "image/jpeg"
}
```

**Response (Success):**

```json
{
  "success": true,
  "verificationId": "uuid",
  "nafdacNumber": "A4-101466",
  "found": true,
  "productDetails": {
    "product_name": "1980 Pregabalin 150 mg Capsules",
    "active_ingredients": "Pregabalin",
    "product_category": "Drugs",
    "nrn": "A4-101466",
    "status": "Active"
  }
}
```

**Response (Not Found):**

```json
{
  "success": true,
  "found": false,
  "message": "Product not found in NAFDAC Greenbook"
}
```

## Color Scheme

- **Primary Green**: `#22c55e`
- **Dark Green**: `#16a34a`
- **Light Green**: `#86efac`
- **White**: `#ffffff`
- **Text Dark**: `#1f2937`
- **Text Gray**: `#6b7280`

## Project Structure

```
frontend/
├── src/
│   ├── App.tsx          # Main application component
│   ├── App.css          # Application styles
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── .env.example         # Environment variables template
├── vite.config.ts       # Vite configuration
└── package.json         # Dependencies
```

## Deployment

The frontend is deployed to AWS S3 + CloudFront via CDK:

```bash
# From project root
cdk deploy DrugVerificationFrontendStack
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT
