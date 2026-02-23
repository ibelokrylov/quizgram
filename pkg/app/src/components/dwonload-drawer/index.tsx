import type { DownloadFile } from '@/entities/DownloadFile/download-file.type';
import http from '@/lib/http';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Drawer, DrawerContent } from '../ui/drawer';
import { ResizeImg } from './ui/resize-img';
import { Video } from './ui/video';

export const DownloadDrawer = ({
  disableDownload = false,
  type = 'image',
  open,
  setOpen,
  onFinal,
  className,
  onChangeLoading,
  defaultUrl,
  resize = false,
  targetWidth,
  targetHeight,
}: {
  type: 'image' | 'video' | 'doc' | 'all';
  open: boolean;
  setOpen: (open: boolean) => void;
  onFinal?: (value: string) => void;
  className?: string;
  onChangeLoading?: (loading: boolean) => void;
  disableDownload?: boolean;
  defaultUrl?: string;
  resize?: boolean;
  targetWidth?: number;
  targetHeight?: number;
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showResize, setShowResize] = useState(false);

  function getFileTypeFromMime(mimeType: string): 'image' | 'video' | 'doc' | null {
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    if (mimeType.startsWith('video/')) {
      return 'video';
    }
    if (
      mimeType === 'application/pdf' ||
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'text/plain'
    ) {
      return 'doc';
    }
    return null;
  }

  function validateFileSize(file: File, fileType: 'image' | 'video' | 'doc'): boolean {
    const maxSizes = {
      image: 5 * 1024 * 1024, // 5MB
      video: 150 * 1024 * 1024, // 150MB
      doc: 100 * 1024 * 1024, // 100MB
    };

    if (file.size > maxSizes[fileType]) {
      toast.error(t(`fileUpload.error.${fileType}TooLarge`));
      return false;
    }

    return true;
  }

  function validateFileType(file: File): boolean {
    const fileType = file.type;
    const detectedType = getFileTypeFromMime(fileType);

    if (type === 'all') {
      if (!detectedType) {
        toast.error(t('fileUpload.error.invalidFormat'));
        return false;
      }
      return validateFileSize(file, detectedType);
    }

    if (type === 'image') {
      const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(fileType)) {
        toast.error(t('fileUpload.error.invalidImageFormat'));
        return false;
      }
      return validateFileSize(file, 'image');
    } else if (type === 'video') {
      const validVideoTypes = [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'video/x-msvideo',
      ];
      if (!validVideoTypes.includes(fileType)) {
        toast.error(t('fileUpload.error.invalidVideoFormat'));
        return false;
      }
      return validateFileSize(file, 'video');
    } else if (type === 'doc') {
      const validDocTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ];
      if (!validDocTypes.includes(fileType)) {
        toast.error(t('fileUpload.error.invalidDocFormat'));
        return false;
      }
      return validateFileSize(file, 'doc');
    }

    return true;
  }

  async function uploadFile(file: File) {
    if (!validateFileType(file)) {
      return;
    }

    onChangeLoading?.(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await http<DownloadFile>({
        url: '/v1/user/upload-file',
        method: 'POST',
        formData,
      });
      if (res.data) {
        onFinal?.(res.data.fileURL);
        setOpen(false);
      }
    } catch (err) {
      console.log(err);
      toast.error(t('fileUpload.error.invalidFormat'));
    } finally {
      onChangeLoading?.(false);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (resize && type === 'image' && targetWidth && targetHeight) {
        if (!validateFileType(file)) {
          return;
        }
        setSelectedFile(file);
        setShowResize(true);
      } else {
        uploadFile(file);
      }
    }
    e.target.value = '';
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (!file) {
      return;
    }

    if (resize && type === 'image' && targetWidth && targetHeight) {
      if (!validateFileType(file)) {
        return;
      }
      setSelectedFile(file);
      setShowResize(true);
    } else {
      await uploadFile(file);
    }
  }

  function getAcceptAttribute(): string {
    switch (type) {
      case 'image':
        return 'image/png,image/jpeg,image/jpg,image/gif,image/webp';
      case 'video':
        return 'video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo';
      case 'doc':
        return 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';
      case 'all':
        return '*/*';
      default:
        return '*/*';
    }
  }

  const renderContent = {
    image: (
      <div className="w-full px-4 py-2 flex flex-col gap-4">
        <h1 className="text-2xl font-bold">{t('downloadImage.title')}</h1>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          className={
            'flex gap-3 items-center px-4 py-2 rounded-md border border-gray-200 dark:border-neutral-800 border-dashed cursor-pointer'
          }
        >
          <div>
            <Download size={32} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-neutral-400">
              {t('downloadImage.dragAndDrop')}
            </p>
            <p className="text-xs text-gray-500 dark:text-neutral-400">
              {t('downloadImage.dragAndDropDescription')}
            </p>
          </div>
        </div>
      </div>
    ),
    video: (
      <Video
        disableDownload={disableDownload}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        handleClick={handleClick}
        onFinal={onFinal}
        onClose={() => setOpen(false)}
        defaultUrl={defaultUrl}
      />
    ),
    doc: (
      <div className="w-full px-4 py-2 flex flex-col gap-4">
        <h1 className="text-2xl font-bold">{t('downloadDoc.title')}</h1>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          className={
            'flex gap-3 items-center px-4 py-2 rounded-md border border-gray-200 dark:border-neutral-800 border-dashed cursor-pointer'
          }
        >
          <div>
            <Download size={32} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-neutral-400">
              {t('downloadDoc.dragAndDrop')}
            </p>
            <p className="text-xs text-gray-500 dark:text-neutral-400">
              {t('downloadDoc.dragAndDropDescription')}
            </p>
          </div>
        </div>
      </div>
    ),
    all: (
      <div className="w-full px-4 py-2 flex flex-col gap-4">
        <h1 className="text-2xl font-bold">{t('downloadAll.title')}</h1>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          className={
            'flex gap-3 items-center px-4 py-2 rounded-md border border-gray-200 dark:border-neutral-800 border-dashed cursor-pointer'
          }
        >
          <div>
            <Download size={32} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-neutral-400">
              {t('downloadAll.dragAndDrop')}
            </p>
            <p className="text-xs text-gray-500 dark:text-neutral-400">
              {t('downloadAll.dragAndDropDescription')}
            </p>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          setShowResize(false);
          setSelectedFile(null);
        }
      }}
    >
      <DrawerContent className={showResize ? 'max-h-[95vh]' : ''}>
        <div
          className={cn(
            'w-full p-3 mx-auto',
            showResize ? 'max-w-[800px] overflow-y-auto max-h-[90vh]' : 'max-w-[600px]',
            className
          )}
        >
          {showResize && selectedFile && targetWidth && targetHeight ? (
            <ResizeImg
              targetWidth={targetWidth}
              targetHeight={targetHeight}
              file={selectedFile}
              onFinal={(url: string) => {
                onFinal?.(url);
                setOpen(false);
                setShowResize(false);
                setSelectedFile(null);
              }}
              onCancel={() => {
                setShowResize(false);
                setSelectedFile(null);
              }}
              onChangeLoading={onChangeLoading}
            />
          ) : (
            renderContent[type as keyof typeof renderContent]
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptAttribute()}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};
