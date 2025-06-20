import React, { createContext, useContext, useState } from 'react';

// 각 단계별 입력값 타입 정의
export interface FormData {
  upload: {
    sizeWidth?: string;
    sizeSites?: string;
    size?: string;
    product?: string;
    target?: string;
    price?: string;
  };
  productSpec: { [key: string]: string };
  plan: string;
  usp: { function: string; desc: string }[];
  design: {
    values: string[];
    images: (string | File)[]; // base64, url, or File
    imagesColor: (string | File)[];
    referenceLinks: string[];
    referenceReasons: string;
  };
  shooting: {
    concept: string;
    reference: string;
    images: (string | File)[];
  };
  brief: string;
  referenceFiles: File[];
}

const defaultFormData: FormData = {
  upload: {},
  productSpec: {},
  plan: '',
  usp: [
    { function: '', desc: '' },
    { function: '', desc: '' },
    { function: '', desc: '' },
    { function: '', desc: '' },
    { function: '', desc: '' },
  ],
  design: {
    values: ['', ''],
    images: [],
    imagesColor: [],
    referenceLinks: ['', '', ''],
    referenceReasons: '',
  },
  shooting: {
    concept: '',
    reference: '',
    images: [],
  },
  brief: '',
  referenceFiles: [],
};

const FormDataContext = createContext<{
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
} | undefined>(undefined);

export const FormDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  return (
    <FormDataContext.Provider value={{ formData, setFormData }}>
      {children}
    </FormDataContext.Provider>
  );
};

export function useFormData() {
  const ctx = useContext(FormDataContext);
  if (!ctx) throw new Error('useFormData must be used within a FormDataProvider');
  return ctx;
} 