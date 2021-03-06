import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores';
import styled from 'styled-components/macro';
import { Route, Switch, useHistory, useParams, useRouteMatch } from 'react-router-dom';
import {
  fetchProtest,
  getProtestsForLeader,
  makeUserProtestLeader,
  sendProtestLeaderRequest,
  updateProtest,
  getLatestProtestPictures,
} from '../api';
import { Map, Marker, TileLayer } from 'react-leaflet';
import { ProtectedRoute, ProtestForm, PictureGallery } from '../components';
import {
  ProtestCardDetail,
  ProtestCardGroupButton,
  ProtestCardIcon,
  ProtestCardInfo,
} from '../components/ProtestCard/ProtestCardStyles';
import {
  calculateDistance,
  dateToDayOfWeek,
  formatDate,
  formatDistance,
  isAdmin,
  isAuthenticated,
  isVisitor,
  sortDateTimeList,
} from '../utils';
import { Image } from 'antd';

function getEditButtonLink(user, protest) {
  const editRoute = `/protest/${protest.id}/edit`;

  if (isAdmin(user) || isAuthenticated(user)) {
    return editRoute;
  }

  if (isVisitor(user)) {
    // Sign up before redirected to leader request
    return `/sign-up?returnUrl=${editRoute}`;
  }

  throw new Error(`couldn't find route`);
}

async function _fetchProtest(id, setProtest) {
  const protest = await fetchProtest(id);

  if (protest) {
    setProtest(protest);
  } else {
    // TODO: handle 404
  }
}

function useFetchProtest() {
  const [protest, setProtest] = useState(null);
  const { id } = useParams();

  useEffect(() => {
    _fetchProtest(id, setProtest);
  }, [id]);

  return {
    protest: protest
      ? {
          ...protest,
          dateTimeList: sortDateTimeList(protest.dateTimeList),
        }
      : null,
    setProtest,
  };
}

function getFutureDates(dateTimeList) {
  if (dateTimeList?.length) {
    return dateTimeList.filter((dateTime) => new Date(dateTime.date) >= new Date());
  }
  return [];
}

function ProtestPageContent({ protest, user, userCoordinates }) {
  const history = useHistory();
  const { coordinates, displayName, streetAddress, notes, dateTimeList } = protest;
  const [latestPictures, setLatestPictures] = useState([]);
  const galleryMatch = useRouteMatch('/protest/:id/gallery');
  const store = useStore();

  useEffect(() => {
    async function getLatestPictures() {
      const pictures = await getLatestProtestPictures(protest.id);
      setLatestPictures(pictures);
    }

    getLatestPictures();
  }, [protest]);

  const futureDates = getFutureDates(dateTimeList);

  return (
    <ProtestPageContainer>
      <MapWrapper center={{ lat: coordinates.latitude, lng: coordinates.longitude }} zoom={14}>
        <TileLayer
          attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={{ lat: coordinates.latitude, lng: coordinates.longitude }}></Marker>
      </MapWrapper>

      <ProtestContainer>
        <Info>
          {/* <ProfilePic src="/protest-profile-pic.png" alt="Protester with flag getting sprayed" /> */}
          <Details>
            <Title>{displayName}</Title>
            <ProtestCardInfo>
              {streetAddress && (
                <ProtestCardDetail>
                  <ProtestCardIcon src="/icons/location.svg" alt="" aria-hidden="true" title="מיקום ההפגנה" />
                  {streetAddress}
                </ProtestCardDetail>
              )}
              {userCoordinates.length > 0 && (
                <ProtestCardDetail>
                  <ProtestCardIcon src="/icons/ruler.svg" alt="" />
                  {formatDistance(calculateDistance(userCoordinates, [coordinates.latitude, coordinates.longitude]))}
                </ProtestCardDetail>
              )}
              {notes && <ProtestCardDetail style={{ textAlign: 'center' }}>{notes}</ProtestCardDetail>}
            </ProtestCardInfo>
          </Details>
        </Info>

        {galleryMatch?.isExact ? (
          <PictureGallery protestId={protest.id} date={'2020-10-31'} />
        ) : (
          <>
            <SectionContainer style={{ marginTop: 20 }}>
              <SectionTitle>
                <img src="/icons/photo-gallery-blueish.svg" alt="" />
                תמונות אחרונות מההפגנה
              </SectionTitle>

              {latestPictures.length > 0 ? (
                <>
                  <LatestPicturesWrapper>
                    {latestPictures.map((picture) => (
                      <PictureThumbnail src={picture.imageUrl} alt="" key={picture.id} />
                    ))}
                  </LatestPicturesWrapper>
                  <EditButton onClick={() => history.push(`${history.location.pathname}/gallery`)}>
                    לצפייה בגלריית ההפגנה
                  </EditButton>
                </>
              ) : (
                <>
                  <p>עדיין לא העלו תמונות להפגנה הזו.</p>
                  <EditButton
                    onClick={() => {
                      store.userStore.setUserProtest(protest);
                      history.push(
                        store.userStore.user
                          ? `/upload-image?returnUrl=${history.location.pathname}`
                          : `/sign-up?returnUrl=/upload-image?returnUrl=${history.location.pathname}`
                      );
                    }}
                  >
                    היו ראשונים להעלות תמונה!
                  </EditButton>
                </>
              )}
            </SectionContainer>
            <DatesAndSocial>
              <SectionContainer>
                <SectionTitle>
                  <img src="/icons/clock.svg" alt="" />
                  מועדי הפגנה קרובים
                </SectionTitle>

                <Dates>
                  {futureDates.length > 0 ? (
                    futureDates.map((dateTime) => (
                      <DateCard key={dateTime.id}>
                        <DateText>
                          <h3 style={{ display: 'inline-block', margin: 0 }}>{formatDate(dateTime.date)}</h3> - יום{' '}
                          {dateToDayOfWeek(dateTime.date)} בשעה {dateTime.time}
                        </DateText>
                      </DateCard>
                    ))
                  ) : (
                    <DateCard>
                      <h3>לא עודכנו מועדי הפגנה קרובים.</h3>
                      <p>יודעים מתי ההפגנה הבאה? לחצו על הכפתור לעדכון!</p>
                    </DateCard>
                  )}
                </Dates>
                <EditButton onClick={() => history.push(getEditButtonLink(user, protest))}>עדכון מועדי הפגנה</EditButton>
              </SectionContainer>

              <SectionContainer>
                <SectionTitle>
                  <ProtestCardIcon src="/icons/social.svg" alt="share icon" />
                  ערוצי תקשורת
                </SectionTitle>
                {protest.whatsAppLink && (
                  <ProtestCardGroupButton type="whatsapp" href={protest.whatsAppLink} target="_blank">
                    הצטרפות לקבוצת הוואטסאפ
                  </ProtestCardGroupButton>
                )}
                {protest.telegramLink && (
                  <ProtestCardGroupButton type="telegram" href={protest.telegramLink} target="_blank">
                    הצטרפות לקבוצת הטלגרם
                  </ProtestCardGroupButton>
                )}
                {!protest.whatsAppLink && !protest.telegramLink && <p>להפגנה זו אין דרכי תקשורת.</p>}
                <EditButton onClick={() => history.push(getEditButtonLink(user, protest))}>עדכון דרכי תקשורת</EditButton>
              </SectionContainer>
            </DatesAndSocial>
          </>
        )}
      </ProtestContainer>
    </ProtestPageContainer>
  );
}

function ProtestPage({ user }) {
  const { protest, setProtest } = useFetchProtest();
  const store = useStore();
  const history = useHistory();

  // const { onFileUpload } = useFileUpload(false);
  if (!protest) {
    // TODO: loading state
    return <div>טוען...</div>;
  }

  const { coordinates, id: protestId } = protest;
  const canEdit = !isVisitor(user);

  return (
    <Switch>
      <ProtectedRoute path="/protest/:id/edit" authorized={canEdit}>
        <EditViewContainer>
          <ProtestForm
            initialCoords={[coordinates.latitude, coordinates.longitude]}
            submitCallback={async (params) => {
              // If the user is not a leader for this protest, check if they've reached the amount of protests limit.
              if (!protest.roles?.leader.includes(user.uid) && !isAdmin(user)) {
                const userProtests = await getProtestsForLeader(user.uid);

                if (userProtests.length > 4) {
                  alert('לא ניתן לערוך מידע על יותר מ- 5 הפגנות.\n צרו איתנו קשר אם ישנו צורך לערוך הפגנות מעבר למכסה.');
                  throw new Error('Reached the max amount of protests a user can lead');
                }

                await sendProtestLeaderRequest(user, null, protestId);
                await makeUserProtestLeader(protestId, user.uid);
              }

              const response = await updateProtest({ protestId, params, userId: user.uid });

              // Refetch the protest once update is complete
              _fetchProtest(protestId, setProtest);

              return response;
            }}
            afterSubmitCallback={() => history.push(`/protest/${protestId}`)}
            defaultValues={protest}
            editMode={true}
            isAdmin={isAdmin(user)}
          />
        </EditViewContainer>
      </ProtectedRoute>
      <Route>
        <ProtestPageContent protest={protest} userCoordinates={store.userCoordinates} user={user} />
      </Route>
    </Switch>
  );
}

export default observer(ProtestPage);

//----------------- Styles -------------------------//

const EditViewContainer = styled.div`
  width: 80%;
  max-width: 1000px;
  padding: 24px 0;
  margin: 0 auto;
`;

const ProtestPageContainer = styled.div``;

const ProtestContainer = styled.div`
  margin: 0 auto 30px;
  max-width: 700px;
  padding: 0 15px;
  z-index: 1;

  @media (min-width: 1024px) {
    max-width: 920px;
  }
`;

const Info = styled.div`
  position: relative;
  padding: 20px 34px;
  background: #ffffff;
  box-shadow: 0px 4px 10px -1px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  margin-top: -30px;
  z-index: 5;

  @media (min-width: 600px) {
    display: grid;
    grid-template-columns: 1fr 200px;
  }
`;

const Title = styled.h1`
  font-weight: bold;
  font-size: 28px;
  line-height: 47px;
  color: #000000;
  margin-bottom: 8px;
`;

const MapWrapper = styled(Map)`
  width: 100%;
  height: 256px;
  z-index: 0;
`;

const EditButton = styled.button`
  width: 100%;
  height: auto;
  color: #1251f3;
  border: 1px solid #1251f3;
  box-sizing: border-box;
  font-size: 16px;
  line-height: 18.96px;
  padding-top: 6px;
  padding-bottom: 7px;
  padding-left: 24px;
  padding-right: 24px;
  background: white;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: 0.25s all;

  &:hover {
    background-color: #6e7dff;
    color: #fff;
  }
`;

const SectionContainer = styled.div`
  width: 100%;
  padding: 35px 30px;
  margin-bottom: 20px;
  box-shadow: 0px 4px 10px -1px rgba(0, 0, 0, 0.15);
  background-color: white;

  @media (min-width: 1024px) {
    margin: 0;
  }
`;

const SectionTitle = styled.div`
  font-size: 16px;
  line-height: 19px;
  color: #1251f3;
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  img {
    height: 15px;
    width: 15px;
    margin-left: 9px;
  }
`;

const Details = styled.div``;

const DatesAndSocial = styled.div`
  margin-top: 24px;
  display: grid;

  @media (min-width: 1024px) {
    gap: 25px;
    grid-template-columns: 2fr 1.25fr;
  }
`;

const Dates = styled.ul`
  width: 100%;
  padding: 0;
  margin: 0 0 20px;

  @media (min-width: 768px) {
    max-width: 420px;
  }
`;

const DateCard = styled.li`
  list-style: none;
`;

const DateText = styled.span`
  font-size: 18px;
  font-weight: 400;
  line-height: 28px;
`;

const LatestPicturesWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 5px;
  margin-bottom: 12.5px;

  @media (min-width: 580px) {
    gap: 10px;
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const PictureThumbnail = styled(Image)`
  width: 100%;
  cursor: pointer;

  img {
    height: 120px;
    object-fit: cover;

    @media (min-width: 580px) {
      height: 220px;
    }
  }
`;
