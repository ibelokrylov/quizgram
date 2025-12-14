import { Button, Card, Divider, List, Placeholder } from '@telegram-apps/telegram-ui';
import { useContext } from 'react';
import { AiFillWechat } from 'react-icons/ai';
import { FaFacebook, FaInstagram, FaLinkedin, FaTelegramPlane, FaTiktok, FaWhatsapp, FaYoutube } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { IoLogoVk, IoMailOutline } from 'react-icons/io5';
import { SlLink } from 'react-icons/sl';
import { AppContext, type QuizThxPage } from '../../App.context';

const socialIcons = {
  Instagram: (
    <FaInstagram
      size={24}
      className='social-icon instagram'
    />
  ),
  Vk: (
    <IoLogoVk
      size={24}
      className='social-icon vk'
    />
  ),
  Youtube: (
    <FaYoutube
      size={24}
      className='social-icon youtube'
    />
  ),
  Facebook: (
    <FaFacebook
      size={24}
      className='social-icon facebook'
    />
  ),
  X: (
    <FaXTwitter
      size={24}
      className='social-icon x'
    />
  ),
  Telegram: (
    <FaTelegramPlane
      size={24}
      className='social-icon telegram'
    />
  ),
  Tiktok: (
    <FaTiktok
      size={24}
      className='social-icon tiktok'
    />
  ),
  Wechat: (
    <AiFillWechat
      size={24}
      className='social-icon wechat'
    />
  ),
  WhatsApp: (
    <FaWhatsapp
      size={24}
      className='social-icon whatsapp'
    />
  ),
  LinkedIn: (
    <FaLinkedin
      size={24}
      className='social-icon linkedin'
    />
  ),
  'E-mail': (
    <IoMailOutline
      size={24}
      className='social-icon email'
    />
  ),
};

function renderTitle(title: string, uid: string) {
  const storageKey = `quiz_contact_${uid}`;
  const userData = sessionStorage.getItem(storageKey);
  if (!userData) return title;

  const userDataJson = JSON.parse(userData);
  const answers = userDataJson.answers || {};

  let result = title;

  // Заменяем плейсхолдеры, если значения определены
  if (answers.name !== undefined) {
    result = result.replace(/\[name\]/g, answers.name);
  }
  if (answers.email !== undefined) {
    result = result.replace(/\[email\]/g, answers.email);
  }
  if (answers.phone !== undefined) {
    result = result.replace(/\[phone\]/g, answers.phone);
  }
  if (answers.text !== undefined) {
    result = result.replace(/\[text\]/g, answers.text);
  }

  return result;
}

export const ThxPage = () => {
  const { quiz } = useContext(AppContext);

  if (!quiz?.thxPage) return null;
  const content = quiz.thxPage satisfies QuizThxPage;

  const processedTitle = renderTitle(content.title || 'Спасибо, [name]!', quiz.uid);
  const processedDescription = content.description ? renderTitle(content.description, quiz.uid) : undefined;

  return (
    <Card className='cards full'>
      <List>
        <Placeholder
          header={processedTitle}
          description={processedDescription}
        />
        {content.buttons.length > 0 ? <Divider /> : null}
        {content.buttons.map((button) => (
          <a
            key={button.link}
            href={button.link}
            className='thxpage-button-item'
            target='_blank'
            rel='noopener noreferrer'
          >
            <Button
              size='m'
              mode='gray'
              className='thxpage-button-item__button'
            >
              <span className='thxpage-button'>
                <span>
                  <SlLink />
                </span>
                <span> {button.title}</span>
              </span>
            </Button>
          </a>
        ))}
        {content.social.length > 0 ? <Divider /> : null}
        {content.social.length > 0 ? (
          <div className='thxpage-social-container'>
            {content.social.map((soc) => (
              <a
                key={soc.type}
                href={soc.link}
                target='_blank'
                rel='noopener noreferrer'
              >
                <Button mode={'bezeled'}>{socialIcons[soc.type as keyof typeof socialIcons]}</Button>
              </a>
            ))}
          </div>
        ) : null}
      </List>
    </Card>
  );
};
