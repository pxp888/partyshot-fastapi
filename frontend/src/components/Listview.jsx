import ListItem from "./ListItem";


function Listview({ photos, sortedPhotos, lastPhotoElementRef, selectMode, selected, setSelected, setFocus, isFetching }) {
    return (
        <div className="albumListview">
            {photos.length === 0 ? (
                <p>No files in this album.</p>
            ) : (
                <div className="listview">
                    {sortedPhotos.map((file, index) => {
                        if (sortedPhotos.length === index + 1) {
                            return (
                                <div ref={lastPhotoElementRef} key={file.id}>
                                    <ListItem
                                        index={index}
                                        file={file}
                                        selectMode={selectMode}
                                        selected={selected}
                                        setSelected={setSelected}
                                        setFocus={setFocus}
                                    />
                                </div>
                            );
                        } else {
                            return (
                                <ListItem
                                    index={index}
                                    key={file.id}
                                    file={file}
                                    selectMode={selectMode}
                                    selected={selected}
                                    setSelected={setSelected}
                                    setFocus={setFocus}
                                />
                            );
                        }
                    })}
                    {isFetching && (
                        <div className="fetchingStatus">
                            <p>Loading more...</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Listview;