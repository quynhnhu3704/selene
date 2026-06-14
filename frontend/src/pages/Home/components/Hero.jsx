// frontend\src\pages\Home\components\Hero.jsx
import hero1 from "../../../assets/images/hero1.png";
import hero2 from "../../../assets/images/hero2.png";
import hero3 from "../../../assets/images/hero3.png";

export default function Hero() {
  return (
    <div id="heroCarousel" className="carousel slide" data-bs-ride="carousel">

      {/* indicators */}
      <div className="carousel-indicators">
        <button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="0" className="active"></button>
        <button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="1"></button>
        <button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="2"></button>
      </div>

      {/* slides */}
      <div className="carousel-inner">
        <div className="carousel-item active">
          <a href="#">
            <img src={hero1} className="d-block w-100" alt="slide1" />
          </a>
        </div>

        <div className="carousel-item">
          <a href="#">
            <img src={hero2} className="d-block w-100" alt="slide2" />
          </a>
        </div>

        <div className="carousel-item">
          <a href="#">
            <img src={hero3} className="d-block w-100" alt="slide3" />
          </a>
        </div>
      </div>

      {/* controls */}
      {/* <button className="carousel-control-prev" type="button" data-bs-target="#heroCarousel" data-bs-slide="prev">
        <span className="carousel-control-prev-icon"></span>
      </button>

      <button className="carousel-control-next" type="button" data-bs-target="#heroCarousel" data-bs-slide="next">
        <span className="carousel-control-next-icon"></span>
      </button> */}

    </div>
  );
}