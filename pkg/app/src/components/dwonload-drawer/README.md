# DownloadDrawer Component

Компонент для загрузки файлов с поддержкой изменения размера изображений.

## Основные возможности

- Загрузка изображений, видео и документов
- Drag & Drop поддержка
- Валидация типов и размеров файлов
- **Изменение размера изображений** с выбором режима обрезки/подгонки
- Превью изображений перед загрузкой
- **Увеличенный размер drawer** для комфортной работы с resize (800px вместо 600px)
- **Защита от случайного закрытия** - drawer нельзя закрыть свайпом вниз при работе с resize

## Использование

### Базовая загрузка изображения

```tsx
import { DownloadDrawer } from '@/components/dwonload-drawer';

function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <DownloadDrawer
      type="image"
      open={open}
      setOpen={setOpen}
      onFinal={(url) => console.log('Uploaded:', url)}
    />
  );
}
```

### Загрузка с изменением размера

```tsx
import { DownloadDrawer } from '@/components/dwonload-drawer';

function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <DownloadDrawer
      type="image"
      open={open}
      setOpen={setOpen}
      resize={true}
      targetWidth={1920}
      targetHeight={1080}
      onFinal={(url) => console.log('Uploaded resized image:', url)}
    />
  );
}
```

### Загрузка видео

```tsx
<DownloadDrawer
  type="video"
  open={open}
  setOpen={setOpen}
  defaultUrl="https://example.com/video.mp4"
  onFinal={(url) => console.log('Video uploaded:', url)}
/>
```

## Props

| Prop              | Тип                                    | По умолчанию | Описание                                                 |
| ----------------- | -------------------------------------- | ------------ | -------------------------------------------------------- |
| `type`            | `'image' \| 'video' \| 'doc' \| 'all'` | `'image'`    | Тип загружаемого файла                                   |
| `open`            | `boolean`                              | -            | Состояние открытия drawer                                |
| `setOpen`         | `(open: boolean) => void`              | -            | Функция для изменения состояния открытия                 |
| `onFinal`         | `(url: string) => void`                | -            | Callback после успешной загрузки                         |
| `onChangeLoading` | `(loading: boolean) => void`           | -            | Callback для отслеживания состояния загрузки             |
| `className`       | `string`                               | -            | Дополнительные CSS классы                                |
| `disableDownload` | `boolean`                              | `false`      | Отключить загрузку файла (только для видео)              |
| `defaultUrl`      | `string`                               | -            | URL по умолчанию (для видео)                             |
| `resize`          | `boolean`                              | `false`      | Включить режим изменения размера                         |
| `targetWidth`     | `number`                               | -            | Целевая ширина изображения (требуется при `resize=true`) |
| `targetHeight`    | `number`                               | -            | Целевая высота изображения (требуется при `resize=true`) |

## Режимы изменения размера

При включенном `resize` пользователь может выбрать один из трех режимов:

### 1. Cover (Заполнить)

Изображение обрезается по краям для соответствия целевым пропорциям. Весь canvas заполнен изображением.

**Интерактивное позиционирование**: В режиме Cover пользователь может перетаскивать изображение мышью для выбора области, которая будет видна после обрезки. Курсор меняется на "grab" (рука), что указывает на возможность перемещения.

```tsx
<DownloadDrawer
  type="image"
  resize={true}
  targetWidth={1920}
  targetHeight={1080}
  // Пользователь выбирает режим "Cover" и может перетаскивать изображение
/>
```

### 2. Contain (Вместить)

Изображение вписывается полностью с добавлением фона по краям. Пользователь может выбрать цвет фона.

```tsx
<DownloadDrawer
  type="image"
  resize={true}
  targetWidth={1920}
  targetHeight={1080}
  // Пользователь выбирает режим "Contain" и цвет фона
/>
```

### 3. Fill (Растянуть)

Изображение растягивается до целевого размера. Может исказить пропорции.

```tsx
<DownloadDrawer
  type="image"
  resize={true}
  targetWidth={1920}
  targetHeight={1080}
  // Пользователь выбирает режим "Fill"
/>
```

## Валидация файлов

### Изображения

- **Форматы**: PNG, JPG, JPEG, GIF, WEBP
- **Максимальный размер**: 5MB

### Видео

- **Форматы**: MP4, WEBM, OGG, MOV, AVI
- **Максимальный размер**: 150MB

### Документы

- **Форматы**: PDF, DOC, DOCX, TXT
- **Максимальный размер**: 100MB

## Примеры использования

### Загрузка логотипа с изменением размера

```tsx
function LogoUpload() {
  const [open, setOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  return (
    <>
      <button onClick={() => setOpen(true)}>Загрузить логотип</button>

      <DownloadDrawer
        type="image"
        open={open}
        setOpen={setOpen}
        resize={true}
        targetWidth={200}
        targetHeight={200}
        onFinal={(url) => {
          setLogoUrl(url);
          console.log('Logo uploaded:', url);
        }}
      />

      {logoUrl && <img src={logoUrl} alt="Logo" />}
    </>
  );
}
```

### Загрузка баннера для мобильных и веб

```tsx
function BannerUpload() {
  const [openMobile, setOpenMobile] = useState(false);
  const [openWeb, setOpenWeb] = useState(false);

  return (
    <>
      {/* Мобильный баннер 9:20 */}
      <DownloadDrawer
        type="image"
        open={openMobile}
        setOpen={setOpenMobile}
        resize={true}
        targetWidth={1080}
        targetHeight={1920}
        onFinal={(url) => console.log('Mobile banner:', url)}
      />

      {/* Веб баннер 3:2 */}
      <DownloadDrawer
        type="image"
        open={openWeb}
        setOpen={setOpenWeb}
        resize={true}
        targetWidth={1792}
        targetHeight={1509}
        onFinal={(url) => console.log('Web banner:', url)}
      />
    </>
  );
}
```

## Локализация

Компонент поддерживает i18next для локализации. Ключи переводов:

```json
{
  "resizeImage.title": "Изменить размер изображения",
  "resizeImage.targetSize": "Целевой размер: {{width}}x{{height}}",
  "resizeImage.currentSize": "Текущий размер: {{width}}x{{height}}",
  "resizeImage.mode.cover": "Заполнить (обрезать)",
  "resizeImage.mode.contain": "Вместить (добавить фон)",
  "resizeImage.mode.fill": "Растянуть",
  "resizeImage.backgroundColor": "Цвет фона",
  "resizeImage.zoom": "Масштаб",
  "resizeImage.upload": "Загрузить",
  "resizeImage.cancel": "Отмена",
  "resizeImage.dragToPosition": "Перетащите изображение для позиционирования"
}
```

## Интерактивное позиционирование и масштабирование

В режиме **Cover** доступны функции перетаскивания и масштабирования изображения:

### Перетаскивание (Drag & Drop)

- **Курсор**: Меняется на "grab" (рука) при наведении, "grabbing" при перетаскивании
- **Ограничения**: Перемещение ограничено так, чтобы canvas всегда был заполнен изображением
- **Двумерное перемещение**: Изображение можно перемещать по горизонтали и вертикали одновременно
- **Умные ограничения**: Система автоматически определяет допустимый диапазон перемещения по каждой оси
- **Интеграция с zoom**: При увеличении масштаба доступно больше пространства для перемещения
- **Живое превью**: Изменения отображаются в реальном времени

### Масштабирование (Zoom)

- **Диапазон**: От 50% до 300% (0.5x - 3x)
- **Слайдер**: Интуитивный контрол с иконками увеличения/уменьшения
- **Процент**: Отображение текущего масштаба в процентах
- **Интеграция с drag**: Ограничения перемещения автоматически адаптируются под текущий масштаб
- **Сброс**: Масштаб сбрасывается при смене режима

### Пример использования с позиционированием и масштабированием

```tsx
function BannerUpload() {
  return (
    <DownloadDrawer
      type="image"
      resize={true}
      targetWidth={1920}
      targetHeight={1080}
      onFinal={(url) => console.log('Banner uploaded:', url)}
    />
  );
}

// Пользователь:
// 1. Загружает изображение 3000x2000
// 2. Выбирает режим "Cover"
// 3. Использует слайдер для увеличения масштаба (например, 150%)
// 4. Перетаскивает изображение по горизонтали и вертикали для выбора нужной области
// 5. Точно настраивает композицию с помощью zoom и двумерного позиционирования
// 6. Нажимает "Загрузить"
```

## Технические детали

- Использует Canvas API для изменения размера изображений на клиенте
- Поддерживает качество изображения 95% при конвертации
- Автоматически определяет тип файла по MIME-type
- Валидирует размер файла перед загрузкой
- Отправляет обработанное изображение на сервер через FormData
- **Drag & Drop позиционирование**: Использует события мыши (mouseDown, mouseMove, mouseUp) для интерактивного перемещения
- **Умные ограничения**: Автоматически рассчитывает допустимый диапазон перемещения на основе размеров изображения, целевых пропорций и текущего масштаба
- **Zoom слайдер**: Плавное масштабирование от 50% до 300% с шагом 10%
- **Адаптивные ограничения**: Границы перемещения пересчитываются при изменении масштаба
- **Увеличенный drawer**: При работе с resize drawer расширяется до 800px и 95% высоты экрана
- **Защита от закрытия**: Свайп вниз отключен в режиме resize для предотвращения случайного закрытия
- **Прокрутка контента**: Если контент не помещается, доступна вертикальная прокрутка
