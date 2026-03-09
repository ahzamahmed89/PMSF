import React from 'react';
import '../styles/BannerFlag.css';

const BannerFlag = ({ text = 'Service & Quality' }) => {
  return (
    <div className="waving-banner">
      <div className="banner-pole"></div>
      <div className="banner-flag">
        <span>{text}</span>
      </div>
    </div>
  );
};

export default BannerFlag;
