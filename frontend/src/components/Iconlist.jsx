import FileItem from "./FileItem";


function Iconlist({ photos, sortedPhotos, lastPhotoElementRef, selectMode, selected, setSelected, setFocus, isFetching }) {
    return (
        <div className="albumFiles">
            {photos.length === 0 ? (
                <p>No files in this album.</p>
            ) : (
                <div className="fileList">
                    {sortedPhotos.map((file, index) => {
                        if (sortedPhotos.length === index + 1) {
                            return (
                                <div ref={lastPhotoElementRef} key={file.id}>
                                    <FileItem
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
                                <FileItem
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

export default Iconlist;