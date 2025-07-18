import React, { useRef } from 'react';

interface FileUploaderProps {
  onFileSelect: (files: File[]) => void;
  files: File[];
  simple?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, files, simple }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    onFileSelect(selectedFiles);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    simple ? (
      <>
        <input
          type="file"
          ref={inputRef}
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt,image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        />
        <button type="button" onClick={handleClick} style={{ borderRadius: 24, background: '#f5f5f5', border: '1px solid #bbb', padding: '8px 18px', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>파일 업로드</button>
      </>
    ) : (
      <div style={{ border: '1px dashed #aaa', padding: 24, textAlign: 'center', borderRadius: 8 }}>
        <input
          type="file"
          ref={inputRef}
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt,image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        />
        <button type="button" onClick={handleClick} style={{ marginBottom: 12 }}>
          파일 선택
        </button>
        {files && files.length > 0 ? (
          <div>
            {files.map(file => (
              <div key={file.name}><strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)</div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#888' }}>업로드할 파일을 선택하세요 (여러 개 선택 가능)</div>
        )}
      </div>
    )
  );
};

export default FileUploader; 