import "./style/ListItem.css";

function ListItem({
    index,
    file,
    selectMode,
    selected,
    setSelected,
    setFocus,
}) {
    const isSelected = selected.includes(file.id);

    function handleClick(e) {
        e.preventDefault();
        if (selectMode) {
            if (isSelected) {
                setSelected(selected.filter((id) => id !== file.id));
            } else {
                setSelected([...selected, file.id]);
            }
        } else {
            setFocus(index);
        }
    }

    return (
        <div
            className={`listItem ${isSelected ? "selected" : ""}`}
            onClick={handleClick}
        >
            {isSelected && <div className="listItemSelectscreen" />}
            <div className="listItemInfo">
                <div className="listItemInfoItem">
                    <p className="listItemInfoItemTitle">{file.filename}</p>
                </div>
                <div className="listItemInfoItem">
                    <label>user</label>
                    <p>{file.username}</p>
                </div>
                <div className="listItemInfoItem">
                    <label>uploaded</label>
                    <p>{new Date(file.created_at).toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
}

export default ListItem;

