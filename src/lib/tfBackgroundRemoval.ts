import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

let segmenter: bodySegmentation.BodySegmenter | null = null;

async function loadSegmenter() {
  if (segmenter) return segmenter;

  console.log('Loading SelfieSegmentation model...');
  
  const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
  const segmenterConfig: bodySegmentation.MediaPipeSelfieSegmentationMediaPipeModelConfig = {
    runtime: 'mediapipe',
    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation',
    modelType: 'general'
  };

  segmenter = await bodySegmentation.createSegmenter(model, segmenterConfig);
  console.log('SelfieSegmentation model loaded successfully');
  
  return segmenter;
}

export async function removeBackgroundTF(imageElement: HTMLImageElement): Promise<Blob> {
  try {
    console.log('Starting background removal with TensorFlow.js...');
    
    // Load the segmenter
    const segmenter = await loadSegmenter();
    
    // Create canvas for processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Set canvas size to match image
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    
    // Draw original image
    ctx.drawImage(imageElement, 0, 0);
    
    console.log('Running segmentation...');
    
    // Perform segmentation
    const segmentation = await segmenter.segmentPeople(imageElement, {
      flipHorizontal: false,
      multiSegmentation: false,
      segmentBodyParts: false
    });
    
    if (!segmentation || segmentation.length === 0) {
      throw new Error('No segmentation result');
    }
    
    console.log('Segmentation completed, applying mask...');
    
    // Get the mask
    const mask = segmentation[0].mask;
    const maskData = await mask.toImageData();
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const maskPixels = maskData.data;
    
    // Apply mask to alpha channel
    for (let i = 0; i < maskPixels.length; i += 4) {
      const maskValue = maskPixels[i]; // R channel contains the mask
      // If mask value is high (person), keep the pixel, otherwise make transparent
      pixels[i + 3] = maskValue; // Set alpha channel
    }
    
    // Put processed image back
    ctx.putImageData(imageData, 0, 0);
    
    console.log('Mask applied successfully');
    
    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('Successfully created final blob');
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0
      );
    });
  } catch (error) {
    console.error('Error removing background with TF.js:', error);
    throw error;
  }
}

export function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
