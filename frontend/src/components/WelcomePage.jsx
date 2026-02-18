// import React from "react";
import "./style/WelcomePage.css";
import cover1 from "../assets/cover1.webp";
import cover2 from "../assets/cover2.webp";
import cover3 from "../assets/cover3.webp";

function Welcomepage() {
  return (
    <section className="welcomepage">
      <div id="landing">
        <h1 className="title">partyShots</h1>
        <h2>because we don't all have to take the picture.</h2>

        <div className="landing1">
          <div className="hbox">
            {/* <h3>Get the party started</h3>*/}
            <p>
              partyShots is a photo sharing app that allows you to share photos
              with your friends and family. Create an album and invite your
              friends to join. Everyone can share their photos and videos in one
              place.
            </p>
          </div>
          <div className="imdiv1">
            <img src={cover1} alt="landingshot" />
          </div>
        </div>

        <div className="warning">
          <h1>btw, Nothing is private on this site</h1>
          <p>
            Anyone with an album code or username can find files shared on this
            site.
          </p>
          <p>
            This site is intended to help people collaborate, not for private
            storage.
          </p>
        </div>

        <p className="title2">How it works</p>

        <div className="landing2">
          <div className="imdiv2">
            <img src={cover2} alt="landingshot" />
          </div>
          <div className="vbox">
            <h3>Create an album</h3>
            <p>Just type the album name and click create.</p>
            <h3>maybe add some photos,</h3>
            <p>(it is a photo sharing site.)</p>
            <h3>share the album code, or your username</h3>
            <p>
              Anyone with either the album code or your username can view the
              album.
            </p>
            <p>Anyone logged in can see, and add files to an album.</p>
            <p>They can also download the album.</p>
          </div>
        </div>

        <p className="title2">albums and photos</p>

        <div className="landing3">
          <div className="hbox">
            <h3>Uploads</h3>
            <p>Each album and file has an owner.</p>
            <p>Users can upload files to any album. </p>
            <p>Users can subscribe to any album.</p>
            <h3>deletions</h3>
            <p>An album can only be deleted by its owner.</p>
            <p>a file can only be removed by the owner, or the album owner.</p>
          </div>
          <div className="imdiv1">
            <img src={cover3} alt="landingshot" />
          </div>
        </div>

        <div className="footer">
          <ul>
            <li>
              <a href="https://github.com/pxp888/partyshots" target="_blank">
                about
              </a>
            </li>
            <li>
              <a href="https://github.com/pxp888/partyshots" target="_blank">
                contact
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default Welcomepage;
