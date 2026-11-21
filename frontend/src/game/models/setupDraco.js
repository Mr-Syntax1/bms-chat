import { useGLTF } from '@react-three/drei';

// دیکودر Draco محلی؛ باید قبل از اولین preload مدل‌ها ست شود
useGLTF.setDecoderPath('/draco/');
